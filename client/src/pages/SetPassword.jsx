import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import "./SetPassword.css";

function SetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      alert("Both fields are required");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const res = await api.post(`/auth/set-password/${token}`, {
        password,
        confirmPassword,
      });

      alert(res.data.message);
      navigate("/");
    } catch (error) {
      alert(error.response?.data?.message || error.message || "Error");
    }
  };

  return (
    <div className="set-password-container">
      <div className="set-password-card">
        <h1 className="set-password-title">Set Password</h1>

        <form onSubmit={handleSubmit} className="set-password-form">
          <input
            type="password"
            placeholder="Create password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="set-password-input"
            required
          />

          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="set-password-input"
            required
          />

          <button type="submit" className="set-password-button">
            Set Password
          </button>
        </form>
      </div>
    </div>
  );
}

export default SetPassword;