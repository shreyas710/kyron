import type { Provider, PatientIntake } from "./types";

export const SAFETY_KEYWORDS = [
  "diagnose",
  "diagnosis",
  "treatment plan",
  "what medicine should i take",
  "dose",
  "dosage",
  "is this cancer",
  "should i stop taking",
  "medical advice",
];

export const HELP_COPY =
  "I can help with scheduling, prescription refill check-ins, and office hours or address questions.";

export const SESSION_REFERENCE = "KY-INTERVIEW-MVP";

function nextBusinessDaySlots(
  targetWeekday: number,
  startOffsetDays: number,
  endOffsetDays: number,
  times: string[],
) {
  const slots: string[] = [];
  const now = new Date();

  for (let offset = startOffsetDays; offset <= endOffsetDays; offset += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);

    if (date.getDay() !== targetWeekday) {
      continue;
    }

    for (const time of times) {
      slots.push(`${date.toISOString().slice(0, 10)}T${time}:00`);
    }
  }

  return slots;
}

export const PROVIDERS: Provider[] = [
  {
    id: "dr-rivera",
    name: "Dr. Sofia Rivera",
    specialty: "Cardiology",
    bodyParts: ["heart", "chest", "cardio", "blood pressure"],
    officeName: "Kyron Midtown Heart Center",
    address: "415 W 38th St, New York, NY 10018",
    hours: "Mon-Fri, 8:00 AM - 5:30 PM",
    availabilities: [
      ...nextBusinessDaySlots(1, 30, 60, ["09:00", "11:00"]),
      ...nextBusinessDaySlots(3, 30, 60, ["10:00", "14:30"]),
    ],
  },
  {
    id: "dr-chen",
    name: "Dr. Evan Chen",
    specialty: "Dermatology",
    bodyParts: ["skin", "rash", "acne", "eczema", "mole"],
    officeName: "Kyron Uptown Skin Clinic",
    address: "220 E 79th St, New York, NY 10075",
    hours: "Mon-Fri, 9:00 AM - 6:00 PM",
    availabilities: [
      ...nextBusinessDaySlots(2, 30, 60, ["09:30", "13:00", "15:30"]),
      ...nextBusinessDaySlots(4, 30, 60, ["10:00", "14:00"]),
    ],
  },
  {
    id: "dr-patel",
    name: "Dr. Mira Patel",
    specialty: "Orthopedics",
    bodyParts: ["knee", "ankle", "shoulder", "hip", "bone", "joint"],
    officeName: "Kyron Downtown Ortho",
    address: "91 Chambers St, New York, NY 10007",
    hours: "Mon-Fri, 7:30 AM - 4:30 PM",
    availabilities: [
      ...nextBusinessDaySlots(1, 30, 60, ["08:00", "13:30"]),
      ...nextBusinessDaySlots(4, 30, 60, ["09:00", "11:30", "15:00"]),
    ],
  },
  {
    id: "dr-johnson",
    name: "Dr. Leah Johnson",
    specialty: "Ophthalmology",
    bodyParts: ["eye", "vision", "retina", "glaucoma", "blurry vision"],
    officeName: "Kyron Vision & Eye",
    address: "310 Park Ave S, New York, NY 10010",
    hours: "Mon-Fri, 8:30 AM - 5:00 PM",
    availabilities: [
      ...nextBusinessDaySlots(2, 30, 60, ["08:30", "11:00"]),
      ...nextBusinessDaySlots(5, 30, 60, ["10:30", "12:00"]),
    ],
  },
];

export const EMPTY_INTAKE: PatientIntake = {
  firstName: "",
  lastName: "",
  dob: "",
  phone: "",
  email: "",
  reason: "",
  smsOptIn: false,
};
