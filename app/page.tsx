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

function ProgramSelect({ label, programs, value, onChange, disabledId, unavailableMessage, choiceCounts }: {
  label: string; programs: Program[]; value: string; onChange: (id: string) => void; disabledId?: string; unavailableMessage?: string; choiceCounts: Map<string, number>;
}) {
  const [query, setQuery] = useState("");
  const selected = programs.find((program) => program.id === value);
  const matches = useMemo(() => programs.filter((program) =>
    program.id !== disabledId && `${programLabel(program)} ${program.institution_name} ${program.city}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))
  ), [programs, disabledId, query]);

  const selectedCount = choiceCounts.get(value) ?? 0;
  return <div>
    <label className="mb-1.5 flex items-center justify-between gap-3 text-sm font-medium text-slate-700"><span>{label}</span>{selected && <span className="font-semibold text-red-600">{selectedCount} {selectedCount === 1 ? "inscrito" : "inscritos"}</span>}</label>
    <input value={selected ? programLabel(selected) : query} onChange={(event) => { setQuery(event.target.value); if (selected) onChange(""); }}
      placeholder="Pesquisar programa ou cidade" autoComplete="off"
      className="w-full rounded-lg border bg-white px-3 py-2.5 text-base outline-none ring-emerald-600 transition focus:ring-2 sm:text-sm" />
    {!selected && <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border bg-white shadow-sm">
      {programs.length === 0 ? <p className="px-3 py-2 text-sm text-amber-800">{unavailableMessage ?? "A lista de programas ainda não foi carregada."}</p> : matches.length ? matches.map((program) => <button type="button" key={program.id} onClick={() => { onChange(program.id); setQuery(""); }} className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-emerald-50 active:bg-emerald-50 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span className="min-w-0"><span className="font-medium">{programLabel(program)}</span><span className="ml-1 text-slate-500">({program.city})</span></span><span className="shrink-0 font-semibold text-red-600">{choiceCounts.get(program.id) ?? 0} {(choiceCounts.get(program.id) ?? 0) === 1 ? "inscrito" : "inscritos"}</span>
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
  const [exporting, setExporting] = useState(false);

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
  const choiceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    candidates.forEach((candidate) => {
      counts.set(candidate.first_choice_program_id, (counts.get(candidate.first_choice_program_id) ?? 0) + 1);
      counts.set(candidate.second_choice_program_id, (counts.get(candidate.second_choice_program_id) ?? 0) + 1);
    });
    return counts;
  }, [candidates]);
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

  async function exportPdf() {
    if (!enriched.length) return setMessage("Ainda não há dados para exportar.");
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const document = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = document.internal.pageSize.getWidth();
      const pageHeight = document.internal.pageSize.getHeight();
      const margin = 42;
      const contentWidth = pageWidth - margin * 2;
      let cursor = margin;
      const nextPage = () => { document.addPage(); cursor = margin; };
      const reserve = (height: number) => { if (cursor + height > pageHeight - margin) nextPage(); };
      const text = (value: string, size = 10, color: [number, number, number] = [30, 41, 59]) => {
        document.setFont("helvetica", "normal"); document.setFontSize(size); document.setTextColor(...color);
        const lines = document.splitTextToSize(value, contentWidth);
        reserve(lines.length * (size + 3)); document.text(lines, margin, cursor); cursor += lines.length * (size + 3) + 5;
      };
      const heading = (value: string, level: 1 | 2 = 1) => {
        reserve(level === 1 ? 36 : 28); document.setFont("helvetica", "bold"); document.setFontSize(level === 1 ? 18 : 13); document.setTextColor(6, 95, 70);
        document.text(value, margin, cursor); cursor += level === 1 ? 28 : 22;
      };

      heading("Ranking Colaborativo - Medicina de Emergência");
      text(`Relatório gerado em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(new Date())}.`, 9, [71, 85, 105]);
      text("Ranking não oficial. A posição é uma estimativa baseada somente nas notas adicionadas pelos participantes.", 9, [71, 85, 105]);
      text(`${generalRows.length} candidatos e ${programs.filter((program) => (choiceCounts.get(program.id) ?? 0) > 0).length} programas com inscritos.`, 10);
      cursor += 8;
      programs.filter((program) => (choiceCounts.get(program.id) ?? 0) > 0).forEach((program) => {
        const rows = rankRows(enriched.filter((candidate) => candidate.first_choice_program_id === program.id || candidate.second_choice_program_id === program.id).sort((a, b) => b.score - a.score));
        reserve(90); heading(programLabel(program), 2);
        text(`Instituição: ${program.institution_name}`, 9);
        text(`Cenário de prática: ${program.practice_scenario} - ${program.city}/${program.state}`, 9);
        text(`${rows.length} ${rows.length === 1 ? "inscrito" : "inscritos"}:`, 9, [185, 28, 28]);
        rows.forEach((candidate) => text(`${candidate.rank}º - ${candidate.name} - Nota ${scoreLabel(candidate.score)} - ${candidate.first_choice_program_id === program.id ? "1ª opção" : "2ª opção"}`, 10));
        cursor += 8;
      });
      const totalPages = document.getNumberOfPages();
      for (let page = 1; page <= totalPages; page += 1) { document.setPage(page); document.setFontSize(8); document.setTextColor(100, 116, 139); document.text(`Página ${page} de ${totalPages}`, pageWidth - margin, pageHeight - 20, { align: "right" }); }
      document.save(`ranking-medicina-emergencia-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch { setMessage("Não foi possível gerar o PDF. Tente novamente."); }
    finally { setExporting(false); }
  }

  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
    <header className="mb-7 max-w-4xl border-l-4 border-emerald-600 pl-4"><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ranking Colaborativo — Medicina de Emergência</h1><p className="mt-2 text-sm leading-6 text-slate-600">Adicione sua nota e suas duas opções para acompanhar uma estimativa de classificação entre os participantes do grupo.</p><p className="mt-3 text-xs text-slate-500">Ranking não oficial. Considera apenas os candidatos que adicionaram seus dados.</p></header>
    <section className="max-w-4xl rounded-xl border bg-white p-4 shadow-sm sm:p-6"><h2 className="text-lg font-semibold">Adicionar ao ranking</h2><p className="mt-1 text-xs text-slate-500">Os dados inseridos ficarão visíveis para os demais participantes.</p><p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">Não é necessário usar seu nome completo: você pode usar as primeiras letras ou outro identificador que conseguirá lembrar posteriormente.</p>
      <form onSubmit={submit} className="mt-5 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-sm font-medium">Nome</label><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="w-full rounded-lg border px-3 py-2.5 text-base outline-none ring-emerald-600 focus:ring-2 sm:text-sm" placeholder="Seu nome" /></div><div><label className="mb-1.5 block text-sm font-medium">Pontuação/nota</label><input value={score} onChange={(event) => setScore(event.target.value)} inputMode="decimal" className="w-full rounded-lg border px-3 py-2.5 text-base outline-none ring-emerald-600 focus:ring-2 sm:text-sm" placeholder="Ex.: 92,5" /></div></div>
        <ProgramSelect label="1ª opção" programs={programs} value={firstChoice} onChange={setFirstChoice} disabledId={secondChoice} unavailableMessage="A lista não carregou. Configure as variáveis do Supabase e execute o schema e o seed." choiceCounts={choiceCounts} />
        <ProgramSelect label="2ª opção" programs={programs} value={secondChoice} onChange={setSecondChoice} disabledId={firstChoice} unavailableMessage="A lista não carregou. Configure as variáveis do Supabase e execute o schema e o seed." choiceCounts={choiceCounts} />
        <button disabled={loading || submitting} className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{submitting ? "Adicionando…" : "Adicionar ao ranking"}</button>{message && <p role="status" className="text-sm text-emerald-800">{message}</p>}
      </form></section>
    <section className="mt-7"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex rounded-lg bg-emerald-50 p-1"><button onClick={() => setTab("program")} className={`flex-1 rounded-md px-2 py-2.5 text-sm font-medium sm:px-3 ${tab === "program" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600"}`}>Ranking por programa</button><button onClick={() => setTab("general")} className={`flex-1 rounded-md px-2 py-2.5 text-sm font-medium sm:px-3 ${tab === "general" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600"}`}>Ranking geral</button></div><button onClick={() => void exportPdf()} disabled={!enriched.length || exporting} className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">{exporting ? "Gerando PDF…" : "Exportar lista em PDF"}</button></div>
      {tab === "program" ? <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6"><div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><label className="text-sm font-medium">Ver ranking de:</label><span className="text-sm font-semibold text-red-600">{choiceCounts.get(selectedProgram) ?? 0} {(choiceCounts.get(selectedProgram) ?? 0) === 1 ? "inscrito" : "inscritos"}</span></div><select value={selectedProgram} onChange={(event) => setSelectedProgram(event.target.value)} className="w-full min-w-0 rounded-lg border bg-white px-3 py-2.5 text-base outline-none ring-emerald-600 focus:ring-2 sm:text-sm">{programs.map((program) => <option value={program.id} key={program.id}>{programLabel(program)} ({program.city}) — {choiceCounts.get(program.id) ?? 0} inscritos</option>)}</select><p className="mt-4 text-sm text-slate-600"><strong>{programRows.length}</strong> candidatos escolheram este programa <span className="text-slate-400">·</span> {firstCount} como 1ª opção <span className="text-slate-400">·</span> {programRows.length - firstCount} como 2ª opção</p><RankingList rows={programRows} selectedProgram={selectedProgram} /></div> : <div className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="border-b px-4 py-4 sm:px-6"><h2 className="font-semibold">Ranking geral</h2></div><ol className="divide-y sm:hidden">{generalRows.map((candidate) => <li key={candidate.id} className="px-4 py-3 text-sm"><div className="flex items-baseline gap-3"><span className="w-9 shrink-0 font-semibold text-emerald-800">{candidate.rank}º</span><span className="min-w-0 flex-1 break-words font-medium">{candidate.name}</span><span className="font-semibold">{scoreLabel(candidate.score)}</span></div><dl className="mt-1.5 space-y-0.5 pl-12 text-xs text-slate-600"><div><dt className="inline font-medium text-slate-500">1ª: </dt><dd className="inline">{programLabel(candidate.first_program)}</dd></div><div><dt className="inline font-medium text-slate-500">2ª: </dt><dd className="inline">{programLabel(candidate.second_program)}</dd></div></dl></li>)}</ol><div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Posição</th><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Nota</th><th className="px-4 py-3">1ª opção</th><th className="px-4 py-3">2ª opção</th></tr></thead><tbody>{generalRows.map((candidate) => <tr key={candidate.id} className="border-t"><td className="px-4 py-3 font-semibold">{candidate.rank}º</td><td className="px-4 py-3">{candidate.name}</td><td className="px-4 py-3">{scoreLabel(candidate.score)}</td><td className="px-4 py-3">{programLabel(candidate.first_program)}</td><td className="px-4 py-3">{programLabel(candidate.second_program)}</td></tr>)}</tbody></table></div>{!generalRows.length && <Empty />}</div>}
    </section><p className="mt-8 text-center text-xs text-slate-400">Programas de Medicina de Emergência do ENARE 2026/2027.</p>
  </main>;
}

function RankingList({ rows, selectedProgram }: { rows: Array<CandidateWithPrograms & { rank: number }>; selectedProgram: string }) {
  if (!rows.length) return <Empty />;
  return <ol className="mt-4 divide-y">{rows.map((candidate) => <li key={candidate.id} className="flex items-center gap-3 py-3 text-sm"><span className="w-8 font-semibold text-emerald-800">{candidate.rank}º</span><span className="min-w-0 flex-1 break-words font-medium">{candidate.name}</span><span className="shrink-0">{scoreLabel(candidate.score)}</span><span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-800">{candidate.first_choice_program_id === selectedProgram ? "1ª opção" : "2ª opção"}</span></li>)}</ol>;
}

function Empty() { return <p className="px-1 py-8 text-center text-sm text-slate-500">Ainda não há candidatos neste ranking.</p>; }
