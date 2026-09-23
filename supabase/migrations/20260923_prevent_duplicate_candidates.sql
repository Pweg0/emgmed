-- Execute depois de revisar/remover eventuais duplicados já existentes.
-- Impede que o mesmo nome, nota e par de escolhas seja salvo mais de uma vez.
alter table public.candidates
  add constraint candidates_unique_submission
  unique (name, score, first_choice_program_id, second_choice_program_id);
