import { useEffect, useState } from "react";
import api from "../services/api";
import "./AdminDashboard.css";

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const getToken = () => localStorage.getItem("token");

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users", {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      setUsers(res.data);
    } catch (error) {
      console.log("FETCH USERS ERROR:", error.response?.data || error.message);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post(
        "/admin/users",
        { username, email },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      alert(res.data.message);
      setUsername("");
      setEmail("");
      fetchUsers();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          error.message ||
          "Failed to create user"
      );
    }
  };

  const handleResendEmail = async (userId) => {
    try {
      const res = await api.post(
        `/admin/users/resend-email/${userId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      alert(res.data.message);
      fetchUsers();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          error.message ||
          "Failed to resend email"
      );
    }
  };

  return (
    <div className="admin-container">
      <h1 className="admin-header">Admin Dashboard</h1>

      <h2 className="admin-section-title">Create User</h2>
      <form onSubmit={handleCreateUser} className="admin-form">
        <input
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="admin-input"
          required
        />

        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="admin-input"
          required
        />

        <button type="submit" className="admin-button">
          Create User
        </button>
      </form>

      <h2 className="admin-section-title">All Users</h2>

      {users.length === 0 ? (
        <div className="admin-empty">No users found</div>
      ) : (
        <ul className="admin-user-list">
          {users.map((user) => (
            <li key={user._id} className="admin-user-item">
              <div className="admin-user-info">
                <span className="admin-user-name">{user.username}</span>
                <span className="admin-user-email">{user.email}</span>
                <span className="admin-role-badge">{user.role}</span>
              </div>
              
              {user.role === "user" && (
                <button
                  onClick={() => handleResendEmail(user._id)}
                  className="admin-action-btn"
                >
                  Resend Email
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AdminDashboard;