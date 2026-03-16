import type { FormEvent, Dispatch, SetStateAction } from "react";
import type { PatientIntake } from "../types";

interface IntakeFormProps {
  intakeDraft: PatientIntake;
  setIntakeDraft: Dispatch<SetStateAction<PatientIntake>>;
  formError: string | null;
  handleIntakeFormSubmit: (event: FormEvent<HTMLFormElement>) => void;
  resetForm: () => void;
}

export function IntakeForm({
  intakeDraft,
  setIntakeDraft,
  formError,
  handleIntakeFormSubmit,
  resetForm,
}: IntakeFormProps) {
  return (
    <section className='rise flex flex-col rounded-2xl border border-gray-200 bg-white p-4 md:p-5'>
      <h2 className='text-lg text-gray-900'>Patient Intake Form</h2>

      <form className='mt-4 space-y-3' onSubmit={handleIntakeFormSubmit}>
        <div className='grid gap-3 sm:grid-cols-2'>
          <label className='text-sm text-gray-600'>
            First name
            <input
              value={intakeDraft.firstName}
              onChange={(event) =>
                setIntakeDraft((current) => ({
                  ...current,
                  firstName: event.target.value,
                }))
              }
              className='mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600'
              placeholder='Jane'
            />
          </label>
          <label className='text-sm text-gray-600'>
            Last name
            <input
              value={intakeDraft.lastName}
              onChange={(event) =>
                setIntakeDraft((current) => ({
                  ...current,
                  lastName: event.target.value,
                }))
              }
              className='mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600'
              placeholder='Doe'
            />
          </label>
        </div>

        <label className='block text-sm text-gray-600'>
          Date of birth (MM/DD/YYYY)
          <input
            value={intakeDraft.dob}
            onChange={(event) =>
              setIntakeDraft((current) => ({
                ...current,
                dob: event.target.value,
              }))
            }
            className='mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600'
            placeholder='01/31/1990'
          />
        </label>

        <label className='block text-sm text-gray-600'>
          Phone number
          <input
            value={intakeDraft.phone}
            onChange={(event) =>
              setIntakeDraft((current) => ({
                ...current,
                phone: event.target.value,
              }))
            }
            className='mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600'
            placeholder='(555) 123-4567'
          />
        </label>

        <label className='block text-sm text-gray-600'>
          Email
          <input
            value={intakeDraft.email}
            onChange={(event) =>
              setIntakeDraft((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
            className='mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600'
            placeholder='jane@example.com'
          />
        </label>

        <label className='block text-sm text-gray-600'>
          Reason for appointment / body part
          <textarea
            value={intakeDraft.reason}
            onChange={(event) =>
              setIntakeDraft((current) => ({
                ...current,
                reason: event.target.value,
              }))
            }
            rows={3}
            className='mt-1 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600'
            placeholder='Example: knee pain and Tuesday availability'
          />
        </label>

        <label className='flex items-center gap-2 text-sm text-gray-600'>
          <input
            type='checkbox'
            checked={intakeDraft.smsOptIn}
            onChange={(event) =>
              setIntakeDraft((current) => ({
                ...current,
                smsOptIn: event.target.checked,
              }))
            }
          />
          Opt in to SMS reminders
        </label>

        {formError ? (
          <p className='rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600'>
            {formError}
          </p>
        ) : null}

        <div className='flex flex-wrap gap-2'>
          <button
            type='submit'
            className='rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700'>
            Submit Intake
          </button>
          <button
            type='button'
            onClick={resetForm}
            className='rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-blue-600'>
            Reset Form
          </button>
        </div>
      </form>
    </section>
  );
}
