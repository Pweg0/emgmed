export type Program = {
  id: string;
  institution_name: string;
  practice_scenario: string;
  city: string;
  state: string;
};

export type Candidate = {
  id: string;
  name: string;
  score: number;
  first_choice_program_id: string;
  second_choice_program_id: string;
  created_at: string;
};

export type CandidateWithPrograms = Candidate & {
  first_program: Program;
  second_program: Program;
};
