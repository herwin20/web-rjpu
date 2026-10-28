// LoginService.js
import sheetsService from "./googleSheetService";

class LoginService {
  constructor() {
    this.sheetName = "Login";
    this.columns = {
      NO: 0,
      NAMA: 1,
      PASSWORD: 2,
      ROLE: 3,
    };
    this.columnNames = ["NO", "Nama", "Password", "Role"];
    this.currentUser = null;
    this.isLoggedIn = false;
  }

  // Inisialisasi sheet (buat header jika belum ada)
  async init() {
    await sheetsService.init();
    await this.ensureHeaders();
  }

  // Pastikan header sudah ada di sheet
  async ensureHeaders() {
    try {
      const allData = await sheetsService.getAllData(this.sheetName, "A:D");
      if (allData.length === 0) {
        // Buat header row
        await sheetsService.writeData(`${this.sheetName}!A1:D1`, [
          this.columnNames,
        ]);
        console.log("✅ Headers created for Login sheet");

        // Tambahkan default admin (optional)
        await this.addDefaultAdmin();
      }
    } catch (error) {
      console.error("Error ensuring headers:", error);
    }
  }

  // Tambahkan default admin jika belum ada user
  async addDefaultAdmin() {
    const users = await this.getAllUsers();
    if (users.length === 0) {
      await this.register({
        nama: "Admin",
        password: "admin123",
        role: "Admin",
      });
      console.log(
        "✅ Default admin created (username: Admin, password: admin123)",
      );
    }
  }

  // Get semua user
  async getAllUsers() {
    await this.init();
    try {
      const data = await sheetsService.getAllData(this.sheetName, "A:D");
      return data.map((row) => ({
        no: row[this.columnNames[0]] || "",
        nama: row[this.columnNames[1]] || "",
        password: row[this.columnNames[2]] || "",
        role: row[this.columnNames[3]] || "",
      }));
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  }

  // Login function
  async login(nama, password) {
    await this.init();

    try {
      const users = await this.getAllUsers();
      const user = users.find(
        (u) =>
          u.nama.toLowerCase() === nama.toLowerCase() &&
          u.password === password,
      );

      if (user) {
        this.currentUser = {
          no: user.no,
          nama: user.nama,
          role: user.role,
        };
        this.isLoggedIn = true;

        // Simpan ke session storage (optional)
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            "currentUser",
            JSON.stringify(this.currentUser),
          );
          sessionStorage.setItem("isLoggedIn", "true");
        }

        return {
          success: true,
          message: `Login successful! Welcome ${user.nama}`,
          user: this.currentUser,
        };
      } else {
        return {
          success: false,
          message: "Invalid username or password",
        };
      }
    } catch (error) {
      console.error("Error during login:", error);
      return {
        success: false,
        message: "Error during login: " + error.message,
      };
    }
  }

  // Logout function
  async logout() {
    this.currentUser = null;
    this.isLoggedIn = false;

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("currentUser");
      sessionStorage.removeItem("isLoggedIn");
    }

    return {
      success: true,
      message: "Logout successful",
    };
  }

  // Register new user (hanya Admin yang bisa)
  async register(userData, currentUserRole = null) {
    await this.init();

    // Cek permission (hanya Admin yang bisa register)
    const role =
      currentUserRole || (this.currentUser ? this.currentUser.role : null);
    if (role !== "Admin") {
      return {
        success: false,
        message: "Only Admin can register new users",
      };
    }

    try {
      // Cek apakah username sudah ada
      const users = await this.getAllUsers();
      const existingUser = users.find(
        (u) => u.nama.toLowerCase() === userData.nama.toLowerCase(),
      );

      if (existingUser) {
        return {
          success: false,
          message: "Username already exists",
        };
      }

      // Validasi role
      if (userData.role !== "Admin" && userData.role !== "User") {
        return {
          success: false,
          message: "Role must be 'Admin' or 'User'",
        };
      }

      // Get next NO
      const nextNo = users.length + 1;

      const newRow = [
        nextNo.toString(),
        userData.nama,
        userData.password,
        userData.role,
      ];

      const range = `${this.sheetName}!A${nextNo + 1}:D${nextNo + 1}`;
      const result = await sheetsService.writeData(range, [newRow]);

      return {
        success: true,
        message: `User ${userData.nama} registered successfully`,
        data: {
          no: nextNo,
          nama: userData.nama,
          role: userData.role,
        },
      };
    } catch (error) {
      console.error("Error registering user:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Update user (hanya Admin)
  async updateUser(no, updatedData, currentUserRole = null) {
    const role =
      currentUserRole || (this.currentUser ? this.currentUser.role : null);
    if (role !== "Admin") {
      return {
        success: false,
        message: "Only Admin can update users",
      };
    }

    try {
      const users = await this.getAllUsers();
      const userIndex = users.findIndex((u) => u.no === no.toString());

      if (userIndex === -1) {
        return {
          success: false,
          message: `User with NO ${no} not found`,
        };
      }

      // Cek duplikasi nama jika nama diubah
      if (updatedData.nama && updatedData.nama !== users[userIndex].nama) {
        const existingUser = users.find(
          (u) =>
            u.nama.toLowerCase() === updatedData.nama.toLowerCase() &&
            u.no !== no.toString(),
        );

        if (existingUser) {
          return {
            success: false,
            message: "Username already exists",
          };
        }
      }

      const sheetRow = userIndex + 2;
      const updatedRow = [
        no.toString(),
        updatedData.nama || users[userIndex].nama,
        updatedData.password || users[userIndex].password,
        updatedData.role || users[userIndex].role,
      ];

      const range = `${this.sheetName}!A${sheetRow}:D${sheetRow}`;
      const result = await sheetsService.writeData(range, [updatedRow]);

      // Update current user if it's the same user
      if (this.currentUser && this.currentUser.no === no.toString()) {
        this.currentUser.nama = updatedRow[1];
        this.currentUser.role = updatedRow[3];
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            "currentUser",
            JSON.stringify(this.currentUser),
          );
        }
      }

      return {
        success: true,
        message: `User updated successfully`,
        data: result,
      };
    } catch (error) {
      console.error("Error updating user:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Delete user (hanya Admin, tidak bisa delete sendiri)
  async deleteUser(no, currentUserRole = null, currentUserName = null) {
    const role =
      currentUserRole || (this.currentUser ? this.currentUser.role : null);
    const userName =
      currentUserName || (this.currentUser ? this.currentUser.nama : null);

    if (role !== "Admin") {
      return {
        success: false,
        message: "Only Admin can delete users",
      };
    }

    try {
      const users = await this.getAllUsers();
      const userToDelete = users.find((u) => u.no === no.toString());

      if (!userToDelete) {
        return {
          success: false,
          message: `User with NO ${no} not found`,
        };
      }

      // Cek tidak bisa delete sendiri
      if (userToDelete.nama === userName) {
        return {
          success: false,
          message: "You cannot delete your own account",
        };
      }

      const userIndex = users.findIndex((u) => u.no === no.toString());
      const sheetRow = userIndex + 2;

      // Kosongkan baris
      const emptyRow = ["", "", "", ""];
      const range = `${this.sheetName}!A${sheetRow}:D${sheetRow}`;
      await sheetsService.writeData(range, [emptyRow]);

      // Renumber data
      await this.renumberUsers();

      return {
        success: true,
        message: `User ${userToDelete.nama} deleted successfully`,
      };
    } catch (error) {
      console.error("Error deleting user:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Renumber users setelah delete
  async renumberUsers() {
    try {
      const allData = await sheetsService.getAllData(this.sheetName, "A:D");
      let validData = allData.filter(
        (row) =>
          row[this.columnNames[0]] && row[this.columnNames[0]].trim() !== "",
      );

      for (let i = 0; i < validData.length; i++) {
        const newNo = (i + 1).toString();
        if (validData[i][this.columnNames[0]] !== newNo) {
          const sheetRow = i + 2;
          const range = `${this.sheetName}!A${sheetRow}`;
          await sheetsService.updateCell(range, newNo);
        }
      }

      return true;
    } catch (error) {
      console.error("Error renumbering users:", error);
      return false;
    }
  }

  // Get user by NO
  async getUserByNo(no) {
    const users = await this.getAllUsers();
    return users.find((u) => u.no === no.toString());
  }

  // Get user by name
  async getUserByName(nama) {
    const users = await this.getAllUsers();
    return users.find((u) => u.nama.toLowerCase() === nama.toLowerCase());
  }

  // Change password
  async changePassword(nama, oldPassword, newPassword) {
    await this.init();

    try {
      const users = await this.getAllUsers();
      const userIndex = users.findIndex(
        (u) =>
          u.nama.toLowerCase() === nama.toLowerCase() &&
          u.password === oldPassword,
      );

      if (userIndex === -1) {
        return {
          success: false,
          message: "Invalid username or current password",
        };
      }

      // Validasi password baru
      if (newPassword.length < 4) {
        return {
          success: false,
          message: "New password must be at least 4 characters",
        };
      }

      const sheetRow = userIndex + 2;
      const range = `${this.sheetName}!C${sheetRow}`;
      await sheetsService.updateCell(range, newPassword);

      // Update current user session if needed
      if (this.currentUser && this.currentUser.nama === nama) {
        // Password changed, force re-login
        await this.logout();
      }

      return {
        success: true,
        message: "Password changed successfully. Please login again.",
      };
    } catch (error) {
      console.error("Error changing password:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Check if user is logged in
  checkAuth() {
    if (typeof window !== "undefined") {
      const storedUser = sessionStorage.getItem("currentUser");
      const storedLoginStatus = sessionStorage.getItem("isLoggedIn");

      if (storedLoginStatus === "true" && storedUser) {
        this.currentUser = JSON.parse(storedUser);
        this.isLoggedIn = true;
        return true;
      }
    }

    return this.isLoggedIn;
  }

  // Get current user info
  getCurrentUser() {
    this.checkAuth();
    return this.currentUser;
  }

  // Check if current user has role
  hasRole(role) {
    this.checkAuth();
    if (!this.currentUser) return false;

    if (Array.isArray(role)) {
      return role.includes(this.currentUser.role);
    }
    return this.currentUser.role === role;
  }

  // Check if current user is Admin
  isAdmin() {
    return this.hasRole("Admin");
  }

  // Get all users with pagination (hanya Admin)
  async getUsersPaginated(page = 1, limit = 10, currentUserRole = null) {
    const role =
      currentUserRole || (this.currentUser ? this.currentUser.role : null);
    if (role !== "Admin") {
      return {
        success: false,
        message: "Only Admin can view user list",
      };
    }

    const allUsers = await this.getAllUsers();
    const start = (page - 1) * limit;
    const end = start + limit;

    // Remove password from response
    const safeUsers = allUsers.map(({ password, ...user }) => user);

    return {
      success: true,
      data: safeUsers.slice(start, end),
      currentPage: page,
      totalPages: Math.ceil(safeUsers.length / limit),
      totalItems: safeUsers.length,
      limit: limit,
    };
  }

  // Search users (hanya Admin)
  async searchUsers(keyword, currentUserRole = null) {
    const role =
      currentUserRole || (this.currentUser ? this.currentUser.role : null);
    if (role !== "Admin") {
      return {
        success: false,
        message: "Only Admin can search users",
      };
    }

    const allUsers = await this.getAllUsers();
    const lowerKeyword = keyword.toLowerCase();

    const filteredUsers = allUsers.filter((user) => {
      return Object.values(user).some((value) =>
        value.toString().toLowerCase().includes(lowerKeyword),
      );
    });

    // Remove password from response
    const safeUsers = filteredUsers.map(({ password, ...user }) => user);

    return {
      success: true,
      data: safeUsers,
      total: safeUsers.length,
    };
  }

  // Get user statistics (hanya Admin)
  async getUserStats(currentUserRole = null) {
    const role =
      currentUserRole || (this.currentUser ? this.currentUser.role : null);
    if (role !== "Admin") {
      return {
        success: false,
        message: "Only Admin can view statistics",
      };
    }

    const users = await this.getAllUsers();
    const adminCount = users.filter((u) => u.role === "Admin").length;
    const userCount = users.filter((u) => u.role === "User").length;

    return {
      success: true,
      stats: {
        totalUsers: users.length,
        adminCount: adminCount,
        userCount: userCount,
      },
    };
  }

  // Reset all data (hanya untuk development)
  async resetAllData(currentUserRole = null) {
    const role =
      currentUserRole || (this.currentUser ? this.currentUser.role : null);
    if (role !== "Admin") {
      return {
        success: false,
        message: "Only Admin can reset data",
      };
    }

    try {
      // Clear all data except header
      const range = `${this.sheetName}!A2:D1000`;
      const emptyRows = Array(999).fill(Array(4).fill(""));
      await sheetsService.writeData(range, emptyRows);

      // Add default admin
      await this.addDefaultAdmin();

      await this.logout();

      return {
        success: true,
        message: "All data reset successfully",
      };
    } catch (error) {
      console.error("Error resetting data:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

// Export singleton instance
const loginService = new LoginService();
export default loginService;
