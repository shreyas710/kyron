export type Role = "assistant" | "user";

export type Message = {
  id: number;
  role: Role;
  text: string;
};

export type IntakeField =
  | "firstName"
  | "lastName"
  | "dob"
  | "phone"
  | "email"
  | "reason";

export type Workflow = "intake-pending" | "slot-selection" | "booked";

export type PatientIntake = {
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  email: string;
  reason: string;
  smsOptIn: boolean;
};

export type Provider = {
  id: string;
  name: string;
  specialty: string;
  bodyParts: string[];
  officeName: string;
  address: string;
  hours: string;
  availabilities: string[];
};
