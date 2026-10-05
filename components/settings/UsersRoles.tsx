"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useShop } from "@/components/providers/ShopProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SimpleTable } from "@/components/ui/SimpleTable";
import { useToast } from "@/components/ui/Toast";
import { NAV_ITEMS } from "@/lib/config";
import type { Role } from "@/lib/types";

const ROLES: Role[] = ["Owner", "Staff", "Accountant"];

export function UsersRoles() {
  const { users, addUser, updateUser } = useShop();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", username: "", role: "Staff" as Role });
  const [err, setErr] = useState("");

  const save = () => {
    const username = f.username.trim().toLowerCase();
    if (f.name.trim().length < 2) return setErr("Enter the full name");
    if (!/^[a-z0-9._]{3,}$/.test(username)) return setErr("Username: 3+ letters, numbers, dot or underscore");
    if (users.some((u) => u.username === username)) return setErr("That username already exists");
    addUser({ name: f.name.trim(), username, role: f.role });
    toast(`User ${username} added`);
    setAdding(false);
    setErr("");
    setF({ name: "", username: "", role: "Staff" });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">Control who can open which module. Demo logins: admin / admin123, staff / staff123, accounts / acc123.</p>
        <Button variant="primary" onClick={() => setAdding(true)}>
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </div>
      <SimpleTable
        rows={users}
        rowKey={(u) => u.id}
        columns={[
          { head: "Name", cell: (u) => <b>{u.name}</b> },
          { head: "Username", cell: (u) => u.username },
          {
            head: "Role",
            cell: (u) => (
              <Select label="Role" srOnlyLabel className="py-1.5" value={u.role} disabled={u.username === "admin"} onChange={(e) => { updateUser(u.id, { role: e.target.value as Role }); toast(`${u.name} is now ${e.target.value}`); }}>
                {ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            ),
          },
          { head: "Status", cell: (u) => <Badge tone={u.active ? "Paid" : "Unpaid"}>{u.active ? "Active" : "Disabled"}</Badge> },
          {
            head: "Actions",
            cell: (u) => (
              <Button size="sm" disabled={u.username === "admin"} onClick={() => { updateUser(u.id, { active: !u.active }); toast(u.active ? "User disabled" : "User enabled"); }}>
                {u.active ? "Disable" : "Enable"}
              </Button>
            ),
          },
        ]}
      />
      <div>
        <h4 className="mb-2 text-sm font-semibold">Role permissions</h4>
        <SimpleTable
          minWidth={560}
          rows={[...NAV_ITEMS]}
          rowKey={(n) => n.href}
          columns={[
            { head: "Module", cell: (n) => n.label },
            ...ROLES.map((r) => ({ head: r, cell: (n: (typeof NAV_ITEMS)[number]) => ((n.roles as readonly Role[]).includes(r) ? <span className="font-bold text-[#34704b]">✓</span> : <span className="text-muted">—</span>) })),
          ]}
        />
      </div>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add User"
        footer={
          <>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" onClick={save}>
              Save User
            </Button>
          </>
        }
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input label="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input label="Username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
          <Select label="Role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </div>
        {err && (
          <p role="alert" className="mt-3 text-xs text-danger">
            {err}
          </p>
        )}
      </Modal>
    </div>
  );
}
