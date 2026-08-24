// Panda only generates `_group*` variants for pseudo-state conditions,
// not structural `nth-child` ones. These let the add-button background
// follow the row's even/odd striping when the row carries `class="group"`.
export const conditions = {
  groupOdd: ".group:nth-child(odd) &",
  groupEven: ".group:nth-child(even) &",
};
