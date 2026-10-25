import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Users, CalendarCheck, ClipboardList, Megaphone,
  LogOut, Menu, X, Clock3, CheckCircle2, CircleAlert, Plus, RefreshCw
} from "lucide-react";
import api from "./api";

const navItems = [
  { id: "Overview", label: "Overview", icon: LayoutDashboard },
  { id: "Workspace", label: "Workspace", icon: Users },
  { id: "Kanban", label: "Kanban", icon: ClipboardList },
  { id: "Attendance", label: "Attendance", icon: CalendarCheck },
  { id: "Leaves", label: "Leave requests", icon: Clock3 },
  { id: "Announcements", label: "Announcements", icon: Megaphone }
];

function dateLabel(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
function timeLabel(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function ErrorMessage({ children }) {
  return children ? <div className="notice error">{children}</div> : null;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("Overview");
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", department: "Engineering" });
  const [token, setToken] = useState(localStorage.getItem("staffsync_token"));
  const [data, setData] = useState({ employees: [], attendance: [], leaves: [], tasks: [], announcements: [] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "Medium" });
  const [leaveForm, setLeaveForm] = useState({ leaveType: "Casual", startDate: "", endDate: "", reason: "" });
  const [announcementForm, setAnnouncementForm] = useState({ title: "", message: "" });

  const canManage = user && ["admin", "manager"].includes(user.role);
  const canAdmin = user?.role === "admin";

  async function loadAll() {
    if (!token) return;
    setError("");
    try {
      const [employees, attendance, leaves, tasks, announcements] = await Promise.all([
        api.get("/employees"), api.get("/attendance"), api.get("/leaves"),
        api.get("/tasks"), api.get("/announcements")
      ]);
      setData({
        employees: employees.data, attendance: attendance.data, leaves: leaves.data,
        tasks: tasks.data, announcements: announcements.data
      });
    } catch (err) {
      setError(err.response?.data?.message || "Could not load project data. Check that the backend and MongoDB are running.");
    }
  }

  useEffect(() => {
    if (!token) return;
    api.get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => { localStorage.removeItem("staffsync_token"); setToken(null); setUser(null); });
  }, [token]);

  useEffect(() => { if (user) loadAll(); }, [user]);

  async function submitAuth(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
      const payload = authMode === "login" ? { email: authForm.email, password: authForm.password } : authForm;
      const { data: result } = await api.post(endpoint, payload);
      localStorage.setItem("staffsync_token", result.token);
      setToken(result.token); setUser(result.user);
    } catch (err) { setError(err.response?.data?.message || "Authentication failed"); }
    finally { setBusy(false); }
  }

  function logout() {
    localStorage.removeItem("staffsync_token");
    setToken(null); setUser(null); setData({ employees: [], attendance: [], leaves: [], tasks: [], announcements: [] });
  }

  async function action(fn) {
    setError(""); setBusy(true);
    try { await fn(); await loadAll(); }
    catch (err) { setError(err.response?.data?.message || "Action failed"); }
    finally { setBusy(false); }
  }

  if (!token || !user) {
    return <div className="auth-screen">
      <div className="auth-art">
        <div className="brand-mark">S</div>
        <p className="eyebrow">PEOPLE • WORK • PROGRESS</p>
        <h1>Great teams<br />start with <span>StaffSync.</span></h1>
        <p className="muted-light">One workspace for your people operations, attendance, leave and team tasks.</p>
        <div className="art-card"><div className="fake-avatar">SS</div><div><b>People first.</b><small>Everything in sync.</small></div><CheckCircle2 size={22} /></div>
      </div>
      <div className="auth-panel">
        <div className="auth-form-wrap">
          <div className="brand small"><span className="brand-mark">S</span> StaffSync</div>
          <h2>{authMode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="muted">{authMode === "login" ? "Sign in to continue to your workspace." : "Register as an employee to get started."}</p>
          <ErrorMessage>{error}</ErrorMessage>
          <form onSubmit={submitAuth} className="form-stack">
            {authMode === "register" && <>
              <label>Full name<input required value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} placeholder="e.g. Aditi Sharma" /></label>
              <label>Department<input value={authForm.department} onChange={e => setAuthForm({ ...authForm, department: e.target.value })} placeholder="Engineering" /></label>
            </>}
            <label>Email address<input required type="email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} placeholder="you@company.com" /></label>
            <label>Password<input required minLength="8" type="password" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} placeholder="At least 8 characters" /></label>
            <button className="btn primary full" disabled={busy}>{busy ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"}</button>
          </form>
          <p className="auth-switch">{authMode === "login" ? "New to StaffSync?" : "Already have an account?"} <button onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setError(""); }}>{authMode === "login" ? "Create an account" : "Sign in"}</button></p>
          <p className="tiny-note">Demo project · Do not use real company or personal data.</p>
        </div>
      </div>
    </div>;
  }

  const today = new Date().toDateString();
  const todayAttendance = data.attendance.find(row => new Date(row.dateKey).toDateString() === today || row.dateKey === new Date().toISOString().slice(0, 10));
  const pendingLeaves = data.leaves.filter(item => item.status === "Pending").length;
  const todoCount = data.tasks.filter(task => task.status !== "Done").length;

  function changeTaskStatus(task, status) {
    return action(() => api.patch(`/tasks/${task._id}`, { status }));
  }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="brand"><span className="brand-mark">S</span><span>StaffSync<small>PEOPLE WORKSPACE</small></span><button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
      <div className="side-label">MENU</div>
      <nav>{navItems.map(item => {
        const Icon = item.icon;
        return <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => { setPage(item.id); setMobileOpen(false); }}>
          <Icon size={18} /><span>{item.label}</span>
          {item.id === "Leaves" && pendingLeaves > 0 && <em>{pendingLeaves}</em>}
        </button>;
      })}</nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon">✦</div><b>Keep your team in sync</b><p>Manage people and everyday work from one place.</p></div>
        <button className="nav-item logout" onClick={logout}><LogOut size={18} /><span>Sign out</span></button>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <button className="menu-toggle" onClick={() => setMobileOpen(true)}><Menu /></button>
        <div><p className="top-eyebrow">STAFFSYNC / WORKSPACE</p><h1>{page}</h1></div>
        <div className="top-actions"><button className="icon-button" title="Refresh" onClick={loadAll}><RefreshCw size={17} /></button><div className="profile"><div className="avatar">{user.name.split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase()}</div><div><b>{user.name}</b><small>{user.role} · {user.department}</small></div></div></div>
      </header>
      <div className="content">
        <ErrorMessage>{error}</ErrorMessage>
        {page === "Overview" && <Overview user={user} data={data} pendingLeaves={pendingLeaves} todoCount={todoCount} todayAttendance={todayAttendance} onPage={setPage} />}
        {page === "Workspace" && <Workspace data={data} />}
        {page === "Kanban" && <Kanban data={data} form={taskForm} setForm={setTaskForm} canManage={canManage} busy={busy} onCreate={() => action(async () => { await api.post("/tasks", taskForm); setTaskForm({ title: "", description: "", priority: "Medium" }); })} onStatus={changeTaskStatus} onDelete={id => action(() => api.delete(`/tasks/${id}`))} />}
        {page === "Attendance" && <Attendance data={data} todayAttendance={todayAttendance} busy={busy} onCheckIn={() => action(() => api.post("/attendance/check-in"))} onCheckOut={() => action(() => api.post("/attendance/check-out"))} />}
        {page === "Leaves" && <Leaves data={data} user={user} form={leaveForm} setForm={setLeaveForm} busy={busy} canManage={canManage} onCreate={() => action(async () => { await api.post("/leaves", leaveForm); setLeaveForm({ leaveType: "Casual", startDate: "", endDate: "", reason: "" }); })} onStatus={(id, status) => action(() => api.patch(`/leaves/${id}/status`, { status }))} />}
        {page === "Announcements" && <Announcements data={data} user={user} form={announcementForm} setForm={setAnnouncementForm} canManage={canManage} canAdmin={canAdmin} onCreate={() => action(async () => { await api.post("/announcements", announcementForm); setAnnouncementForm({ title: "", message: "" }); })} onDelete={id => action(() => api.delete(`/announcements/${id}`))} />}
        <footer>StaffSync <span>•</span> Modern human resource management <span>•</span> MERN project</footer>
      </div>
    </main>
  </div>;
}

function Overview({ user, data, pendingLeaves, todoCount, todayAttendance, onPage }) {
  const cards = [
    { title: "Team members", value: data.employees.length, sub: "People in your workspace", icon: Users, tone: "blue" },
    { title: "Pending leave", value: pendingLeaves, sub: "Requests awaiting review", icon: Clock3, tone: "orange" },
    { title: "Open tasks", value: todoCount, sub: "Tasks not yet completed", icon: ClipboardList, tone: "purple" },
    { title: "Attendance", value: todayAttendance?.checkIn ? "Checked in" : "Not checked in", sub: "Your status today", icon: CalendarCheck, tone: "green" }
  ];
  return <>
    <div className="welcome-banner"><div><p className="eyebrow">YOUR PEOPLE, ONE PLACE</p><h2>Good to see you, {user.name.split(" ")[0]} 👋</h2><p>Here's what's happening across your workspace today.</p></div><div className="banner-shape">S</div></div>
    <div className="stats-grid">{cards.map(card => { const Icon = card.icon; return <div className="stat-card" key={card.title}><div className={`stat-icon ${card.tone}`}><Icon size={20} /></div><p>{card.title}</p><h3>{card.value}</h3><small>{card.sub}</small></div>; })}</div>
    <div className="two-col">
      <section className="panel"><div className="panel-heading"><div><h3>Recent announcements</h3><p>Updates from your organization</p></div><button className="text-button" onClick={() => onPage("Announcements")}>View all</button></div>
        {data.announcements.length ? data.announcements.slice(0,3).map(item => <div className="announcement-row" key={item._id}><div className="announcement-icon"><Megaphone size={17}/></div><div><b>{item.title}</b><p>{item.message}</p><small>{item.author?.name || "StaffSync"} · {dateLabel(item.createdAt)}</small></div></div>) : <Empty text="No announcements yet." />}
      </section>
      <section className="panel"><div className="panel-heading"><div><h3>Quick actions</h3><p>Jump straight into your work</p></div></div>
        <div className="quick-actions">
          <button onClick={() => onPage("Attendance")}><span className="quick-icon green"><CalendarCheck size={19}/></span><span><b>Mark attendance</b><small>Check in or check out</small></span></button>
          <button onClick={() => onPage("Leaves")}><span className="quick-icon orange"><Clock3 size={19}/></span><span><b>Request leave</b><small>Submit time-off request</small></span></button>
          <button onClick={() => onPage("Kanban")}><span className="quick-icon purple"><ClipboardList size={19}/></span><span><b>View team tasks</b><small>Track your work</small></span></button>
        </div>
      </section>
    </div>
    <section className="panel"><div className="panel-heading"><div><h3>Team directory preview</h3><p>People connected to your workspace</p></div><button className="text-button" onClick={() => onPage("Workspace")}>Open directory</button></div><EmployeeTable employees={data.employees.slice(0,5)} /></section>
  </>;
}

function Workspace({ data }) {
  const [search, setSearch] = useState("");
  const employees = useMemo(() => data.employees.filter(e => `${e.name} ${e.email} ${e.department} ${e.designation}`.toLowerCase().includes(search.toLowerCase())), [data.employees, search]);
  return <section className="panel"><div className="panel-heading"><div><h3>Employee directory</h3><p>Browse team members and their details</p></div><span className="count-pill">{data.employees.length} members</span></div><input className="search-input" placeholder="Search name, email or department…" value={search} onChange={e => setSearch(e.target.value)} /><EmployeeTable employees={employees} /></section>;
}
function EmployeeTable({ employees }) {
  if (!employees.length) return <Empty text="No employees found. Create another account to populate the directory." />;
  return <div className="table-wrap"><table><thead><tr><th>EMPLOYEE</th><th>DEPARTMENT</th><th>DESIGNATION</th><th>ROLE</th></tr></thead><tbody>{employees.map(e => <tr key={e._id}><td><div className="person-cell"><div className="avatar">{e.name?.split(" ").map(s=>s[0]).slice(0,2).join("").toUpperCase()}</div><div><b>{e.name}</b><small>{e.email}</small></div></div></td><td>{e.department || "General"}</td><td>{e.designation || "Employee"}</td><td><span className="role-pill">{e.role}</span></td></tr>)}</tbody></table></div>;
}

function Kanban({ data, form, setForm, canManage, busy, onCreate, onStatus, onDelete }) {
  const columns = ["Todo", "In Progress", "Done"];
  return <div className="page-stack">
    {canManage && <section className="panel"><div className="panel-heading"><div><h3>Create a task</h3><p>Add a task to the team board</p></div></div><form className="inline-form task-form" onSubmit={e => { e.preventDefault(); onCreate(); }}><input required placeholder="Task title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><input placeholder="Description (optional)" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select><button className="btn primary" disabled={busy}><Plus size={16}/> Add task</button></form></section>}
    <div className="kanban-grid">{columns.map((column, index) => { const tasks = data.tasks.filter(task => task.status === column); return <section className="kanban-column" key={column}><div className="column-heading"><span className={`column-dot dot-${index}`}></span><b>{column}</b><span className="column-count">{tasks.length}</span></div>{tasks.map(task => <article className="task-card" key={task._id}><div className="task-card-top"><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span>{canManage && <button className="mini-delete" title="Delete task" onClick={()=>onDelete(task._id)}>×</button>}</div><h4>{task.title}</h4>{task.description && <p>{task.description}</p>}<div className="task-meta"><span>{task.assignee?.name || "Unassigned"}</span><span>{dateLabel(task.dueDate)}</span></div><select aria-label={`Change status for ${task.title}`} value={task.status} onChange={e=>onStatus(task,e.target.value)}><option>Todo</option><option>In Progress</option><option>Done</option></select></article>)}{!tasks.length && <div className="column-empty">No tasks here yet</div>}</section>; })}</div>
  </div>;
}

function Attendance({ data, todayAttendance, busy, onCheckIn, onCheckOut }) {
  return <div className="page-stack"><section className="attendance-hero"><div className="attendance-symbol"><CalendarCheck size={28}/></div><div><p className="eyebrow">TODAY'S ATTENDANCE</p><h2>{todayAttendance?.checkIn ? "You're checked in" : "Ready to start your day?"}</h2><p>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p></div><div className="attendance-buttons"><button className="btn primary" disabled={busy || !!todayAttendance?.checkIn} onClick={onCheckIn}>Check in</button><button className="btn secondary" disabled={busy || !todayAttendance?.checkIn || !!todayAttendance?.checkOut} onClick={onCheckOut}>Check out</button></div></section>
    <section className="panel"><div className="panel-heading"><div><h3>Attendance history</h3><p>Recent attendance records</p></div></div>{data.attendance.length ? <div className="table-wrap"><table><thead><tr><th>EMPLOYEE</th><th>DATE</th><th>CHECK IN</th><th>CHECK OUT</th></tr></thead><tbody>{data.attendance.map(row=><tr key={row._id}><td>{row.user?.name || "You"}</td><td>{row.dateKey}</td><td>{timeLabel(row.checkIn)}</td><td>{timeLabel(row.checkOut)}</td></tr>)}</tbody></table></div> : <Empty text="No attendance records yet. Check in to create your first record." />}</section>
  </div>;
}

function Leaves({ data, user, form, setForm, busy, canManage, onCreate, onStatus }) {
  return <div className="page-stack"><section className="panel"><div className="panel-heading"><div><h3>Request time off</h3><p>Submit a leave request for review</p></div></div><form className="form-grid" onSubmit={e=>{e.preventDefault();onCreate();}}><label>Leave type<select value={form.leaveType} onChange={e=>setForm({...form,leaveType:e.target.value})}><option>Casual</option><option>Sick</option><option>Earned</option><option>Other</option></select></label><label>Start date<input required type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></label><label>End date<input required type="date" min={form.startDate || undefined} value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></label><label className="span-all">Reason<textarea required rows="3" placeholder="Briefly explain your request…" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></label><div className="span-all"><button className="btn primary" disabled={busy}><Plus size={16}/> Submit request</button></div></form></section>
    <section className="panel"><div className="panel-heading"><div><h3>Leave requests</h3><p>{canManage ? "Review requests from your team" : "Track the status of your requests"}</p></div><span className="count-pill">{data.leaves.length} requests</span></div>{data.leaves.length ? <div className="table-wrap"><table><thead><tr><th>EMPLOYEE</th><th>TYPE</th><th>DATES</th><th>REASON</th><th>STATUS</th>{canManage&&<th>ACTION</th>}</tr></thead><tbody>{data.leaves.map(leave=><tr key={leave._id}><td>{leave.user?.name || user.name}</td><td>{leave.leaveType}</td><td>{dateLabel(leave.startDate)} – {dateLabel(leave.endDate)}</td><td className="reason-cell">{leave.reason}</td><td><span className={`status-pill ${leave.status.toLowerCase()}`}>{leave.status}</span></td>{canManage&&<td>{leave.status==="Pending" ? <div className="action-pair"><button className="approve" onClick={()=>onStatus(leave._id,"Approved")}>Approve</button><button className="reject" onClick={()=>onStatus(leave._id,"Rejected")}>Reject</button></div> : "—"}</td>}</tr>)}</tbody></table></div> : <Empty text="No leave requests yet." />}</section>
  </div>;
}

function Announcements({ data, user, form, setForm, canManage, canAdmin, onCreate, onDelete }) {
  return <div className="page-stack">{canManage && <section className="panel"><div className="panel-heading"><div><h3>Publish announcement</h3><p>Share important news with your organization</p></div></div><form className="form-grid" onSubmit={e=>{e.preventDefault();onCreate();}}><label className="span-all">Title<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Office holiday update"/></label><label className="span-all">Message<textarea required rows="3" value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Write your announcement…"/></label><div className="span-all"><button className="btn primary"><Plus size={16}/> Publish announcement</button></div></form></section>}
    <section className="panel"><div className="panel-heading"><div><h3>Company announcements</h3><p>Latest news and updates</p></div><span className="count-pill">{data.announcements.length} updates</span></div><div className="announcement-list">{data.announcements.map(item=><article className="announcement-card" key={item._id}><div className="announcement-icon large"><Megaphone size={19}/></div><div className="announcement-body"><h3>{item.title}</h3><p>{item.message}</p><small>Posted by {item.author?.name || "StaffSync"} · {dateLabel(item.createdAt)}</small></div>{canAdmin&&<button className="mini-delete" title="Delete announcement" onClick={()=>onDelete(item._id)}>×</button>}</article>)}{!data.announcements.length&&<Empty text="No announcements have been published."/>}</div></section></div>;
}

function Empty({ text }) {
  return <div className="empty-state"><div className="empty-icon"><CircleAlert size={20}/></div><p>{text}</p></div>;
}
