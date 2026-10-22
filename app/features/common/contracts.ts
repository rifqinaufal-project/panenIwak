export type ConfirmOptions = { title: string; message: string; label?: string };
export type Confirm = (options: ConfirmOptions) => Promise<boolean>;
export type ConfirmationDialog = { confirm: Confirm };
export type FormState = { dirty: boolean; busy: boolean };
