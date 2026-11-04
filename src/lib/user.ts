const USER_ID_KEY = 'ornex_user_id';
const USERNAME_KEY = 'ornex_username';

export function getOrCreateUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export function getOrCreateUsername(): string {
  let name = localStorage.getItem(USERNAME_KEY);
  if (!name) {
    const num = Math.floor(Math.random() * 9000 + 1000);
    name = `user_${num}`;
    localStorage.setItem(USERNAME_KEY, name);
  }
  return name;
}
