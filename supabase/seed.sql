-- Fonte: Anexo II – Vagas Ofertadas, ENARE 2026/2027 (atualizado em 31/08/2026).
-- Filtro aplicado: Especialidade = MEDICINA DE EMERGÊNCIA.
insert into public.programs (institution_name, practice_scenario, city, state) values
('Associação Beneficente Santa Casa de Campo Grande', 'Associação Beneficente Santa Casa de Campo Grande', 'Campo Grande', 'MS'),
('Hospital Regional de Juazeiro', 'Hospital Regional de Juazeiro', 'Juazeiro', 'BA'),
('Hospital de Urgência de Teresina (HUT)', 'Hospital de Urgência de Teresina (HUT)', 'Teresina', 'PI'),
('Escola de Saúde Pública da Paraíba ESP-PB', 'Escola de Saúde Pública da Paraíba ESP-PB', 'João Pessoa', 'PB'),
('Instituto Dr. José Frota', 'Instituto Dr. José Frota', 'Fortaleza', 'CE'),
('Hospital Geral Clériston Andrade', 'Hospital Geral Clériston Andrade', 'Feira de Santana', 'BA'),
('Hospital Geral Roberto Santos', 'Hospital Geral Roberto Santos', 'Salvador', 'BA'),
('Santa Casa de Misericórdia de Sobral / Universidade Federal do Ceará', 'Santa Casa de Misericórdia de Sobral / Universidade Federal do Ceará', 'Sobral', 'CE'),
('Associação Igreja Adventista Missionária', 'Hospital e Maternidade São Vicente de Paulo', 'Itapipoca', 'CE'),
('Secretaria da Saúde do Estado do Ceará', 'Hospital Regional Norte', 'Sobral', 'CE'),
('Escola de Saúde Pública do Ceará', 'Município de Fortaleza/CE', 'Fortaleza', 'CE'),
('Secretaria da Saúde do Estado do Ceará', 'Hospital Regional do Cariri', 'Juazeiro do Norte', 'CE'),
('Santa Casa de Misericórdia de Barretos', 'Santa Casa de Misericórdia de Barretos', 'Barretos', 'SP'),
('Hospital Augusto de Oliveira Camargo', 'Hospital Augusto de Oliveira Camargo', 'Indaiatuba', 'SP'),
('Secretaria Municipal de Saúde do Rio de Janeiro', 'Secretaria Municipal de Saúde do Rio de Janeiro', 'Rio de Janeiro', 'RJ'),
('Santa Casa de Itatiba', 'Santa Casa de Itatiba', 'Itatiba', 'SP'),
('Hospital Geral de Nova Iguaçu', 'Hospital Geral de Nova Iguaçu', 'Nova Iguaçu', 'RJ'),
('Hospital Metropolitano Odilon Behrens', 'Hospital Metropolitano Odilon Behrens', 'Belo Horizonte', 'MG'),
('Santa Casa de Misericórdia de Votuporanga', 'Santa Casa de Misericórdia de Votuporanga', 'Votuporanga', 'SP'),
('Hospital João XXIII', 'Hospital João XXIII', 'Belo Horizonte', 'MG'),
('Hospital Evangélico de Cachoeiro de Itapemirim', 'Hospital Evangélico de Cachoeiro de Itapemirim', 'Cachoeiro de Itapemirim', 'ES'),
('Universidade Federal de Uberlândia - UFU', 'Hospital de Clínicas da Universidade Federal de Uberlândia', 'Uberlândia', 'MG'),
('Empresa Brasileira de Ensino Pesquisa e Extensão S/A – Multivix', 'Hospital Estadual Jayme dos Santos Neves', 'Serra', 'ES'),
('Universidade Federal de Minas Gerais', 'Hospital das Clínicas da UFMG', 'Belo Horizonte', 'MG'),
('Prefeitura Municipal de Pelotas', 'Prefeitura Municipal de Pelotas', 'Pelotas', 'RS')
on conflict (institution_name, practice_scenario, city, state) do nothing;
