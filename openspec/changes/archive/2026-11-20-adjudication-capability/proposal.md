# Adjudication capability for registration

Issue: #216

## Why

`host-choice.ts` owns a `REGISTRATION_VALUES` map that names the Spy's and the
Recluse's legal registration values. That is role data in the engine, and the
role modules cannot own their own adjudication options.

## What changes

- `RoleCapability` gains the `adjudication` arm with a case and legal options.
- The Spy declares the legal values `["good"]`; the Recluse declares
  `["evil", "demon"]`.
- `legalRegistrations` reads the role module's capability instead of the engine
  map. `registrationError` and the information path keep their behavior.
- The engine still owns the host-choice case, the reason, the journal and the
  command answer.

## Impact

No command, state, journal or projection shape changes. Only the source of the
legal registration options moves to the role modules.
