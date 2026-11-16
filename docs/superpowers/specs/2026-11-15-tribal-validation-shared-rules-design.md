# Tribal Validation Shared Rules Design

## Goal

Remove confirmed, behavior-identical duplication between full-form validation
and real-time field validation while preserving current behavior and public
interfaces.

## Scope

Consolidate only the ZIP/state match check and reservation-name validation
currently repeated in `lib/tribal/validation.ts`. Keep that file as the shared
module; do not introduce a new module.

Delivery-reference validation is excluded because paired form and field-level
parity coverage was not found. The route-level required-field checks in
`pages/api/tribal/verify.ts` are also excluded: they intentionally differ from
the mode-dependent and length-aware checks in `lib/tribal/manual-review.ts`.

## Design

Extract small pure checks for the two confirmed rules and use them from both
the full-form and real-time validation paths. The shared checks own the common
conditions and validation messages. Each caller retains its existing reporting
mechanism: full-form validation adds the existing Zod issue, while field-level
validation returns the existing message.

Preserve all current input normalization, accepted values, message text,
validation ordering, and public exports. Avoid broad error handling or behavior
changes.

## Testing

Use the existing paired coverage in
`tests/exemption-certificate-validation.test.js` for both form and field-level
ZIP/state and reservation-name behavior. Run the existing test suite after
refactoring. Add focused parity assertions only if implementation reveals a
behavioral edge not already covered.

## Out of scope

- Delivery-reference validation consolidation.
- New validation rules or changed error messages.
- Tribal verification API behavior or security-sensitive duplicate handling.
- Unrelated project-wide refactoring.
