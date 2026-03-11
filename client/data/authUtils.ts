export interface User {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: "owner" | "vendor";
  password: string;
  vendorId?: string; // vendor accounts: corresponds to VENDOR_PROFILES key (or name)
  onboardingComplete?: boolean;
}

const KEYS = {
  users: "bosun_users",
  currentUser: "bosun_current_user",
};

// Pre-seeded demo accounts — created on first read if localStorage is empty
const SEED_USERS: User[] = [
  {
    id: "user_owner_1",
    email: "dean@bosun.app",
    name: "Dean",
    initials: "D",
    role: "owner",
    password: "password",
    onboardingComplete: true,
  },
  {
    id: "user_vendor_1",
    email: "vendor@bosun.app",
    name: "MarineMax Service Center",
    initials: "MM",
    role: "vendor",
    password: "password",
    vendorId: "MarineMax Service Center",
    onboardingComplete: true,
  },
];

export function getUsers(): User[] {
  try {
    const raw = localStorage.getItem(KEYS.users);
    if (raw) return JSON.parse(raw);
  } catch {}
  // First run — seed and persist
  localStorage.setItem(KEYS.users, JSON.stringify(SEED_USERS));
  return SEED_USERS;
}

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(KEYS.currentUser);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function login(email: string, password: string): User | { error: string } {
  const users = getUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!user) return { error: "Incorrect email or password." };
  localStorage.setItem(KEYS.currentUser, JSON.stringify(user));
  // Sync role context keys
  localStorage.setItem("bosun_role", user.role);
  if (user.role === "vendor" && user.vendorId) {
    localStorage.setItem("bosun_vendor_id", user.vendorId);
  } else {
    localStorage.removeItem("bosun_vendor_id");
  }
  return user;
}

export function logout(): void {
  localStorage.removeItem(KEYS.currentUser);
  localStorage.removeItem("bosun_role");
  localStorage.removeItem("bosun_vendor_id");
}

function makeInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

export function signup(
  email: string,
  password: string,
  name: string,
  role: "owner" | "vendor"
): User | { error: string } {
  const users = getUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { error: "An account with that email already exists." };
  }
  const user: User = {
    id: `user_${Date.now()}`,
    email: email.trim(),
    name: name.trim(),
    initials: makeInitials(name.trim()),
    role,
    password,
    vendorId: role === "vendor" ? name.trim() : undefined,
  };
  localStorage.setItem(KEYS.users, JSON.stringify([...users, user]));
  localStorage.setItem(KEYS.currentUser, JSON.stringify(user));
  localStorage.setItem("bosun_role", role);
  if (role === "vendor") {
    localStorage.setItem("bosun_vendor_id", user.vendorId!);
  } else {
    localStorage.removeItem("bosun_vendor_id");
  }
  return user;
}

export function markOnboardingComplete(): void {
  const user = getCurrentUser();
  if (!user) return;
  user.onboardingComplete = true;
  localStorage.setItem(KEYS.currentUser, JSON.stringify(user));
  const users = getUsers();
  const updated = users.map((u) => (u.id === user.id ? { ...u, onboardingComplete: true } : u));
  localStorage.setItem(KEYS.users, JSON.stringify(updated));
}

/** Update the current user's fields in both session and user list */
export function updateCurrentUser(patch: Partial<User>): void {
  const user = getCurrentUser();
  if (!user) return;
  const updated = { ...user, ...patch };
  localStorage.setItem(KEYS.currentUser, JSON.stringify(updated));
  const users = getUsers();
  const list = users.map((u) => (u.id === user.id ? { ...u, ...patch } : u));
  localStorage.setItem(KEYS.users, JSON.stringify(list));
}
