"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Candidate, CandidateWithPrograms, Program } from "@/lib/types";

function programLabel(program: Program) {
  // Alguns registros oficiais usam um cenário geográfico genérico (por exemplo,
  // "Município de Fortaleza/CE"). Nesses casos, o nome da instituição é mais útil.
  const isGenericLocation = /^município de /i.test(program.practice_scenario.trim());
  const name = !program.practice_scenario || isGenericLocation
    ? program.institution_name
    : program.practice_scenario;
  return `${name} — ${program.state}`;
}

function scoreLabel(score: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(score);
}

function rankRows(rows: CandidateWithPrograms[]) {
  let previousScore: number | undefined;
  let rank = 0;
  return rows.map((candidate, index) => {
    if (candidate.score !== previousScore) rank = index + 1;
    previousScore = candidate.score;
    return { ...candidate, rank };
  });
}

function ProgramSelect({ label, programs, value, onChange, disabledId, unavailableMessage }: {
  label: string; programs: Program[]; value: string; onChange: (id: string) => void; disabledId?: string; unavailableMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const selected = programs.find((program) => program.id === value);
  const matches = useMemo(() => programs.filter((program) =>
    program.id !== disabledId && `${programLabel(program)} ${program.institution_name} ${program.city}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))
  ), [programs, disabledId, query]);

  return <div>
    <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
    <input value={selected ? programLabel(selected) : query} onChange={(event) => { setQuery(event.target.value); if (selected) onChange(""); }}
      placeholder="Pesquisar programa ou cidade" autoComplete="off"
      className="w-full rounded-lg border bg-white px-3 py-2.5 outline-none ring-emerald-600 transition focus:ring-2" />
    {!selected && <div className="mt-1 max-h-44 overflow-y-auto rounded-lg border bg-white shadow-sm">
      {programs.length === 0 ? <p className="px-3 py-2 text-sm text-amber-800">{unavailableMessage ?? "A lista de programas ainda não foi carregada."}</p> : matches.length ? matches.map((program) => <button type="button" key={program.id} onClick={() => { onChange(program.id); setQuery(""); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-emerald-50">
        <span className="font-medium">{programLabel(program)}</span><span className="ml-1 text-slate-500">({program.city})</span>
      </button>) : <p className="px-3 py-2 text-sm text-slate-500">Nenhum programa encontrado.</p>}
    </div>}
  </div>;
}

export default function Home() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [name, setName] = useState("");
  const [score, setScore] = useState("");
  const [firstChoice, setFirstChoice] = useState("");
  const [secondChoice, setSecondChoice] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [tab, setTab] = useState<"program" | "general">("program");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!supabase) { setMessage("Configure o Supabase para carregar a lista oficial de programas."); setLoading(false); return; }
    const [programsResult, candidatesResult] = await Promise.all([
      supabase.from("programs").select("id,institution_name,practice_scenario,city,state").order("state").order("practice_scenario"),
      supabase.from("candidates").select("id,name,score,first_choice_program_id,second_choice_program_id,created_at").order("score", { ascending: false }).order("created_at"),
    ]);
    if (programsResult.error || candidatesResult.error) setMessage("Não foi possível carregar os dados. Verifique a configuração do Supabase.");
    else { setPrograms(programsResult.data as Program[]); setCandidates(candidatesResult.data as Candidate[]); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (!selectedProgram && programs[0]) setSelectedProgram(programs[0].id); }, [programs, selectedProgram]);

  const byId = useMemo(() => new Map(programs.map((program) => [program.id, program])), [programs]);
  const enriched = useMemo(() => candidates.flatMap((candidate) => {
    const first_program = byId.get(candidate.first_choice_program_id);
    const second_program = byId.get(candidate.second_choice_program_id);
    return first_program && second_program ? [{ ...candidate, first_program, second_program }] : [];
  }), [candidates, byId]);
  const programRows = useMemo(() => rankRows(enriched.filter((candidate) => candidate.first_choice_program_id === selectedProgram || candidate.second_choice_program_id === selectedProgram).sort((a, b) => b.score - a.score)), [enriched, selectedProgram]);
  const generalRows = useMemo(() => rankRows([...enriched].sort((a, b) => b.score - a.score)), [enriched]);
  const firstCount = programRows.filter((candidate) => candidate.first_choice_program_id === selectedProgram).length;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setMessage("");
    const normalizedScore = Number(score.replace(",", "."));
    if (!name.trim() || !Number.isFinite(normalizedScore) || normalizedScore < 0 || !firstChoice || !secondChoice) return setMessage("Preencha todos os campos corretamente.");
    if (firstChoice === secondChoice) return setMessage("As duas opções precisam ser programas diferentes.");
    if (!supabase) return setMessage("Configure as variáveis do Supabase para publicar dados.");
    setSubmitting(true);
    const { error } = await supabase.from("candidates").insert({ name: name.trim(), score: normalizedScore, first_choice_program_id: firstChoice, second_choice_program_id: secondChoice });
    setSubmitting(false);
    if (error) return setMessage(error.code === "23505" ? "Este cadastro idêntico já está no ranking." : "Não foi possível salvar. Tente novamente.");
    setName(""); setScore(""); setFirstChoice(""); setSecondChoice(""); setMessage("Nota adicionada ao ranking.");
    await load();
  }

  return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
    <header className="mb-7 border-l-4 border-emerald-600 pl-4"><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ranking Colaborativo — Medicina de Emergência</h1><p className="mt-2 text-sm leading-6 text-slate-600">Adicione sua nota e suas duas opções para acompanhar uma estimativa de classificação entre os participantes do grupo.</p><p className="mt-3 text-xs text-slate-500">Ranking não oficial. Considera apenas os candidatos que adicionaram seus dados.</p></header>
    <section className="rounded-xl border bg-white p-4 shadow-sm sm:p-6"><h2 className="text-lg font-semibold">Adicionar ao ranking</h2><p className="mt-1 text-xs text-slate-500">Os dados inseridos ficarão visíveis para os demais participantes.</p>
      <form onSubmit={submit} className="mt-5 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-sm font-medium">Nome</label><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="w-full rounded-lg border px-3 py-2.5 outline-none ring-emerald-600 focus:ring-2" placeholder="Seu nome" /></div><div><label className="mb-1.5 block text-sm font-medium">Pontuação/nota</label><input value={score} onChange={(event) => setScore(event.target.value)} inputMode="decimal" className="w-full rounded-lg border px-3 py-2.5 outline-none ring-emerald-600 focus:ring-2" placeholder="Ex.: 92,5" /></div></div>
        <ProgramSelect label="1ª opção" programs={programs} value={firstChoice} onChange={setFirstChoice} disabledId={secondChoice} unavailableMessage="A lista não carregou. Configure as variáveis do Supabase e execute o schema e o seed." />
        <ProgramSelect label="2ª opção" programs={programs} value={secondChoice} onChange={setSecondChoice} disabledId={firstChoice} unavailableMessage="A lista não carregou. Configure as variáveis do Supabase e execute o schema e o seed." />
        <button disabled={loading || submitting} className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{submitting ? "Adicionando…" : "Adicionar ao ranking"}</button>{message && <p role="status" className="text-sm text-emerald-800">{message}</p>}
      </form></section>
    <section className="mt-7"><div className="mb-4 flex rounded-lg bg-emerald-50 p-1"><button onClick={() => setTab("program")} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${tab === "program" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600"}`}>Ranking por programa</button><button onClick={() => setTab("general")} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${tab === "general" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600"}`}>Ranking geral</button></div>
      {tab === "program" ? <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6"><label className="mb-1.5 block text-sm font-medium">Ver ranking de:</label><select value={selectedProgram} onChange={(event) => setSelectedProgram(event.target.value)} className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none ring-emerald-600 focus:ring-2">{programs.map((program) => <option value={program.id} key={program.id}>{programLabel(program)} ({program.city})</option>)}</select><p className="mt-4 text-sm text-slate-600"><strong>{programRows.length}</strong> candidatos escolheram este programa <span className="text-slate-400">·</span> {firstCount} como 1ª opção <span className="text-slate-400">·</span> {programRows.length - firstCount} como 2ª opção</p><RankingList rows={programRows} selectedProgram={selectedProgram} /></div> : <div className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="border-b px-4 py-4 sm:px-6"><h2 className="font-semibold">Ranking geral</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Posição</th><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Nota</th><th className="px-4 py-3">1ª opção</th><th className="px-4 py-3">2ª opção</th></tr></thead><tbody>{generalRows.map((candidate) => <tr key={candidate.id} className="border-t"><td className="px-4 py-3 font-semibold">{candidate.rank}º</td><td className="px-4 py-3">{candidate.name}</td><td className="px-4 py-3">{scoreLabel(candidate.score)}</td><td className="px-4 py-3">{programLabel(candidate.first_program)}</td><td className="px-4 py-3">{programLabel(candidate.second_program)}</td></tr>)}</tbody></table>{!generalRows.length && <Empty />}</div></div>}
    </section><p className="mt-8 text-center text-xs text-slate-400">Programas de Medicina de Emergência do ENARE 2026/2027.</p>
  </main>;
}

function RankingList({ rows, selectedProgram }: { rows: Array<CandidateWithPrograms & { rank: number }>; selectedProgram: string }) {
  if (!rows.length) return <Empty />;
  return <ol className="mt-4 divide-y">{rows.map((candidate) => <li key={candidate.id} className="flex items-center gap-3 py-3 text-sm"><span className="w-8 font-semibold text-emerald-800">{candidate.rank}º</span><span className="min-w-0 flex-1 truncate font-medium">{candidate.name}</span><span>{scoreLabel(candidate.score)}</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-800">{candidate.first_choice_program_id === selectedProgram ? "1ª opção" : "2ª opção"}</span></li>)}</ol>;
}

function Empty() { return <p className="px-1 py-8 text-center text-sm text-slate-500">Ainda não há candidatos neste ranking.</p>; }
