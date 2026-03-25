import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  CalendarDays,
  Loader2,
  Pencil,
  Save,
  Search,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  SquareChartGantt,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import { buildApiUrl } from "../utils/apiBase";

const SUBSCRIPTION_OPTIONS = [
  "active",
  "pending",
  "inactive",
  "suspended",
  "cancelled",
];
const PLAN_OPTIONS = ["monthly", "yearly"];

const emptyUserForm = {
  full_name: "",
  email: "",
  role: "user",
  subscription_plan: "monthly",
  subscription_status: "active",
  charity_percentage: 10,
  charity_id: "",
};

const emptyScoreForm = {
  score: "",
  played_date: new Date().toISOString().slice(0, 10),
};

export default function AdminUserList({ isDark }) {
  const { session } = useAuth();
  const [users, setUsers] = useState([]);
  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [charityFilter, setCharityFilter] = useState("all");
  const [updatingRoleId, setUpdatingRoleId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [savingUser, setSavingUser] = useState(false);
  const [userError, setUserError] = useState("");
  const [activeScoresUser, setActiveScoresUser] = useState(null);
  const [scores, setScores] = useState([]);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [scoreForm, setScoreForm] = useState(emptyScoreForm);
  const [savingScoreId, setSavingScoreId] = useState(null);
  const [scoreError, setScoreError] = useState("");

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    }),
    [session],
  );

  const fetchUsers = useCallback(async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    try {
      const [usersResponse, charitiesResponse] = await Promise.all([
        fetch(buildApiUrl("/admin/users"), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(buildApiUrl("/admin/charities"), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      const [usersData, charitiesData] = await Promise.all([
        usersResponse.json(),
        charitiesResponse.json(),
      ]);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setCharities(Array.isArray(charitiesData) ? charitiesData : []);
    } catch (error) {
      console.error("Error fetching admin users:", error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  const charityMap = useMemo(
    () => new Map(charities.map((charity) => [charity.id, charity.name])),
    [charities],
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const search = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !search ||
          user.full_name?.toLowerCase().includes(search) ||
          user.email?.toLowerCase().includes(search);
        const matchesRole = roleFilter === "all" || user.role === roleFilter;
        const matchesPlan =
          planFilter === "all" ||
          (user.subscription_plan || "monthly") === planFilter;
        const matchesStatus =
          statusFilter === "all" || user.subscription_status === statusFilter;
        const matchesCharity =
          charityFilter === "all" || (user.charity_id || "") === charityFilter;

        return (
          matchesSearch &&
          matchesRole &&
          matchesPlan &&
          matchesStatus &&
          matchesCharity
        );
      }),
    [users, searchTerm, roleFilter, planFilter, statusFilter, charityFilter],
  );

  const openEditModal = (user) => {
    setUserError("");
    setEditingUser(user);
    setUserForm({
      full_name: user.full_name || "",
      email: user.email || "",
      role: user.role || "user",
      subscription_plan: user.subscription_plan || "monthly",
      subscription_status: user.subscription_status || "active",
      charity_percentage: user.charity_percentage ?? 10,
      charity_id: user.charity_id || "",
    });
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setUserForm(emptyUserForm);
    setUserError("");
  };

  const saveUser = async (event) => {
    event.preventDefault();
    if (!editingUser) {
      return;
    }

    setSavingUser(true);
    setUserError("");

    try {
      const response = await fetch(
        buildApiUrl(`/admin/users/${editingUser.id}`),
        {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({
            ...userForm,
            charity_percentage: Number(userForm.charity_percentage),
            charity_id: userForm.charity_id || null,
          }),
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update user");
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === editingUser.id ? payload : user,
        ),
      );
      closeEditModal();
    } catch (error) {
      setUserError(error.message);
    } finally {
      setSavingUser(false);
    }
  };

  const toggleRole = async (userId, currentRole) => {
    const nextRole = currentRole === "admin" ? "user" : "admin";
    setUpdatingRoleId(userId);

    try {
      const response = await fetch(buildApiUrl(`/admin/users/${userId}/role`), {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ role: nextRole }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update role");
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === userId ? payload : user)),
      );
    } catch (error) {
      setUserError(error.message);
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const openScoresModal = async (user) => {
    setActiveScoresUser(user);
    setScores([]);
    setScoreError("");
    setScoreForm(emptyScoreForm);
    setScoresLoading(true);

    try {
      const response = await fetch(
        buildApiUrl(`/admin/users/${user.id}/scores`),
        {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to fetch scores");
      }

      setScores(Array.isArray(payload) ? payload : []);
    } catch (error) {
      setScoreError(error.message);
    } finally {
      setScoresLoading(false);
    }
  };

  const closeScoresModal = () => {
    setActiveScoresUser(null);
    setScores([]);
    setScoreForm(emptyScoreForm);
    setSavingScoreId(null);
    setScoreError("");
  };

  const addScore = async (event) => {
    event.preventDefault();
    if (!activeScoresUser) {
      return;
    }

    setSavingScoreId("new");
    setScoreError("");
    try {
      const response = await fetch(
        buildApiUrl(`/admin/users/${activeScoresUser.id}/scores`),
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            score: Number(scoreForm.score),
            played_date: scoreForm.played_date,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to add score");
      }

      setScores((currentScores) => [payload, ...currentScores]);
      setScoreForm(emptyScoreForm);
    } catch (error) {
      setScoreError(error.message);
    } finally {
      setSavingScoreId(null);
    }
  };

  const updateScoreField = (scoreId, field, value) => {
    setScores((currentScores) =>
      currentScores.map((score) =>
        score.id === scoreId ? { ...score, [field]: value } : score,
      ),
    );
  };

  const saveScore = async (score) => {
    if (!activeScoresUser) {
      return;
    }

    setSavingScoreId(score.id);
    setScoreError("");
    try {
      const response = await fetch(
        buildApiUrl(`/admin/users/${activeScoresUser.id}/scores/${score.id}`),
        {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({
            score: Number(score.score),
            played_date: score.played_date,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update score");
      }

      setScores((currentScores) =>
        currentScores.map((entry) => (entry.id === score.id ? payload : entry)),
      );
    } catch (error) {
      setScoreError(error.message);
    } finally {
      setSavingScoreId(null);
    }
  };

  const deleteScore = async (scoreId) => {
    if (!activeScoresUser || !window.confirm("Delete this score record?")) {
      return;
    }

    setSavingScoreId(scoreId);
    setScoreError("");
    try {
      const response = await fetch(
        buildApiUrl(`/admin/users/${activeScoresUser.id}/scores/${scoreId}`),
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session?.access_token}` },
        },
      );

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Failed to delete score");
      }

      setScores((currentScores) =>
        currentScores.filter((score) => score.id !== scoreId),
      );
    } catch (error) {
      setScoreError(error.message);
    } finally {
      setSavingScoreId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-brand-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_repeat(4,minmax(0,1fr))] gap-3">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all ${
              isDark
                ? "bg-dark-card border-dark-border text-white focus:border-brand-500"
                : "bg-white border-light-border focus:border-brand-500 outline-none"
            }`}
          />
        </div>

        <SelectFilter
          icon={Shield}
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            ["all", "All Roles"],
            ["admin", "Admins"],
            ["user", "Users"],
          ]}
          isDark={isDark}
        />

        <SelectFilter
          icon={CalendarDays}
          value={planFilter}
          onChange={setPlanFilter}
          options={[
            ["all", "All Plans"],
            ...PLAN_OPTIONS.map((plan) => [plan, plan]),
          ]}
          isDark={isDark}
        />

        <SelectFilter
          icon={SlidersHorizontal}
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            ["all", "All Statuses"],
            ...SUBSCRIPTION_OPTIONS.map((status) => [status, status]),
          ]}
          isDark={isDark}
        />

        <SelectFilter
          icon={SquareChartGantt}
          value={charityFilter}
          onChange={setCharityFilter}
          options={[
            ["all", "All Charities"],
            ...charities.map((charity) => [charity.id, charity.name]),
          ]}
          isDark={isDark}
        />
      </div>

      {userError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {userError}
        </div>
      )}

      <div
        className={`overflow-hidden rounded-2xl border ${isDark ? "border-dark-border" : "border-light-border shadow-sm"}`}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={isDark ? "bg-white/5" : "bg-gray-50"}>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                User
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                Role
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                Plan
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                Subscription
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                Charity
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                Joined
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody
            className={
              isDark
                ? "divide-y divide-dark-border"
                : "divide-y divide-light-border bg-white"
            }
          >
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className={`${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"} transition-colors`}
              >
                <td className="px-6 py-4">
                  <div className="font-bold">
                    {user.full_name || "Anonymous Golfer"}
                  </div>
                  <div className="text-sm text-gray-500">
                    {user.email || "No email on file"}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                      user.role === "admin"
                        ? isDark
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-amber-100 text-amber-700 border border-amber-200"
                        : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                    }`}
                  >
                    {user.role === "admin" ? (
                      <ShieldAlert size={12} />
                    ) : (
                      <Shield size={12} />
                    )}
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase bg-brand-500/10 text-brand-500">
                    {user.subscription_plan || "monthly"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      user.subscription_status === "active"
                        ? "bg-green-500/10 text-green-500"
                        : isDark
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-amber-100 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {user.subscription_status || "pending"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="font-semibold">
                    {charityMap.get(user.charity_id) || "Unassigned"}
                  </div>
                  <div className="text-gray-500">
                    {user.charity_percentage ?? 0}% allocation
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : "Unknown"}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <ActionButton
                      isDark={isDark}
                      title={
                        user.role === "admin"
                          ? "Demote to user"
                          : "Promote to admin"
                      }
                      onClick={() => toggleRole(user.id, user.role)}
                      disabled={updatingRoleId === user.id}
                    >
                      {updatingRoleId === user.id ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <UserCog size={16} />
                      )}
                    </ActionButton>
                    <ActionButton
                      isDark={isDark}
                      title="Edit profile"
                      onClick={() => openEditModal(user)}
                    >
                      <Pencil size={16} />
                    </ActionButton>
                    <ActionButton
                      isDark={isDark}
                      title="Manage scores"
                      onClick={() => openScoresModal(user)}
                    >
                      <SquareChartGantt size={16} />
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-500">
            No users matched the current filters.
          </div>
        )}
      </div>

      {editingUser && (
        <ModalShell
          title={`Edit ${editingUser.full_name || editingUser.email || "User"}`}
          isDark={isDark}
          onClose={closeEditModal}
        >
          <form onSubmit={saveUser} className="space-y-4">
            <TextField
              label="Full Name"
              value={userForm.full_name}
              onChange={(value) =>
                setUserForm((current) => ({ ...current, full_name: value }))
              }
              isDark={isDark}
            />
            <TextField
              label="Email"
              type="email"
              value={userForm.email}
              onChange={(value) =>
                setUserForm((current) => ({ ...current, email: value }))
              }
              isDark={isDark}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Role"
                value={userForm.role}
                onChange={(value) =>
                  setUserForm((current) => ({ ...current, role: value }))
                }
                options={VALID_ROLE_OPTIONS}
                isDark={isDark}
              />
              <SelectField
                label="Plan"
                value={userForm.subscription_plan}
                onChange={(value) =>
                  setUserForm((current) => ({
                    ...current,
                    subscription_plan: value,
                  }))
                }
                options={PLAN_OPTIONS.map((plan) => ({
                  value: plan,
                  label: plan,
                }))}
                isDark={isDark}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Subscription"
                value={userForm.subscription_status}
                onChange={(value) =>
                  setUserForm((current) => ({
                    ...current,
                    subscription_status: value,
                  }))
                }
                options={SUBSCRIPTION_OPTIONS.map((status) => ({
                  value: status,
                  label: status,
                }))}
                isDark={isDark}
              />
              <TextField
                label="Charity %"
                type="number"
                value={String(userForm.charity_percentage)}
                onChange={(value) =>
                  setUserForm((current) => ({
                    ...current,
                    charity_percentage: value,
                  }))
                }
                isDark={isDark}
              />
              <SelectField
                label="Assigned Charity"
                value={userForm.charity_id}
                onChange={(value) =>
                  setUserForm((current) => ({ ...current, charity_id: value }))
                }
                options={[
                  { value: "", label: "No charity selected" },
                  ...charities.map((charity) => ({
                    value: charity.id,
                    label: charity.name,
                  })),
                ]}
                isDark={isDark}
              />
            </div>

            {userError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {userError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeEditModal}
                className="px-4 py-2 rounded-xl border border-white/10 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingUser}
                className="btn-primary !py-2.5 flex items-center gap-2"
              >
                {savingUser ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                Save Changes
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {activeScoresUser && (
        <ModalShell
          title={`Manage Scores: ${activeScoresUser.full_name || activeScoresUser.email || "User"}`}
          isDark={isDark}
          onClose={closeScoresModal}
          widthClass="max-w-4xl"
        >
          <div className="space-y-6">
            <form
              onSubmit={addScore}
              className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3"
            >
              <TextField
                label="Score"
                type="number"
                value={String(scoreForm.score)}
                onChange={(value) =>
                  setScoreForm((current) => ({ ...current, score: value }))
                }
                isDark={isDark}
              />
              <TextField
                label="Played Date"
                type="date"
                value={scoreForm.played_date}
                onChange={(value) =>
                  setScoreForm((current) => ({
                    ...current,
                    played_date: value,
                  }))
                }
                isDark={isDark}
              />
              <button
                type="submit"
                disabled={savingScoreId === "new"}
                className="btn-primary !py-3 mt-auto flex items-center justify-center gap-2"
              >
                {savingScoreId === "new" ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                Add Score
              </button>
            </form>

            {scoreError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {scoreError}
              </div>
            )}

            {scoresLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-brand-500" size={32} />
              </div>
            ) : (
              <div
                className={`overflow-hidden rounded-2xl border ${isDark ? "border-dark-border" : "border-light-border"}`}
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={isDark ? "bg-white/5" : "bg-gray-50"}>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                        Score
                      </th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                        Played Date
                      </th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className={
                      isDark
                        ? "divide-y divide-dark-border"
                        : "divide-y divide-light-border bg-white"
                    }
                  >
                    {scores.map((score) => (
                      <tr key={score.id}>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="1"
                            max="45"
                            value={score.score}
                            onChange={(event) =>
                              updateScoreField(
                                score.id,
                                "score",
                                event.target.value,
                              )
                            }
                            className={`w-24 px-3 py-2 rounded-lg border ${
                              isDark
                                ? "bg-dark-card border-dark-border"
                                : "bg-gray-50 border-light-border"
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={score.played_date}
                            onChange={(event) =>
                              updateScoreField(
                                score.id,
                                "played_date",
                                event.target.value,
                              )
                            }
                            className={`px-3 py-2 rounded-lg border ${
                              isDark
                                ? "bg-dark-card border-dark-border"
                                : "bg-gray-50 border-light-border"
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <ActionButton
                              isDark={isDark}
                              title="Save score"
                              onClick={() => saveScore(score)}
                              disabled={savingScoreId === score.id}
                            >
                              {savingScoreId === score.id ? (
                                <Loader2 className="animate-spin" size={16} />
                              ) : (
                                <Save size={16} />
                              )}
                            </ActionButton>
                            <ActionButton
                              isDark={isDark}
                              title="Delete score"
                              onClick={() => deleteScore(score.id)}
                              disabled={savingScoreId === score.id}
                            >
                              <Trash2 size={16} />
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {scores.length === 0 && (
                  <div className="py-16 text-center text-sm text-gray-500">
                    No score history is recorded for this user yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </ModalShell>
      )}
    </div>
  );
}

const VALID_ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
];

function SelectFilter({ icon, value, onChange, options, isDark }) {
  const SelectIcon = icon;

  return (
    <div className="relative">
      <SelectIcon
        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
        size={16}
      />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full appearance-none pl-11 pr-4 py-3 rounded-xl border ${
          isDark
            ? "bg-dark-card border-dark-border text-white"
            : "bg-white border-light-border"
        }`}
      >
        {options.map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ActionButton({ children, isDark, ...props }) {
  return (
    <button
      className={`p-2 rounded-lg transition-all ${
        isDark
          ? "hover:bg-white/10 text-gray-300"
          : "hover:bg-gray-100 text-light-subtext"
      } disabled:opacity-50`}
      {...props}
    >
      {children}
    </button>
  );
}

function ModalShell({
  title,
  children,
  isDark,
  onClose,
  widthClass = "max-w-2xl",
}) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center">
      <div
        className={`w-full ${widthClass} rounded-3xl border p-6 ${isDark ? "bg-dark-bg border-dark-border" : "bg-white border-light-border"}`}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, isDark, type = "text" }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5 opacity-70">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full px-4 py-3 rounded-xl border ${
          isDark
            ? "bg-dark-card border-dark-border text-white"
            : "bg-gray-50 border-light-border"
        }`}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options, isDark }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5 opacity-70">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full px-4 py-3 rounded-xl border ${
          isDark
            ? "bg-dark-card border-dark-border text-white"
            : "bg-gray-50 border-light-border"
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
