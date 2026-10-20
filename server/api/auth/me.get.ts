export default defineEventHandler(async event => ({ user: await requireProfile(event) }));
