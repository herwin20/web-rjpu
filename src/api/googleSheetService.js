// api/googleSheetService.js

import axios from "axios";

class GoogleSheetsService {
  constructor() {
    this.spreadsheetId = "1CUbtN3c2E2G1kKR3Zsgivu6e1_lGzXQjkJ0g0TVhZ2I";
    this.accessToken = null;
    this.tokenExpiry = null;
    this.isInitialized = false;

    // Service Account Credentials
    this.clientEmail =
      "web-rjpu-engineering@web-rjpu-2026.iam.gserviceaccount.com";
    this.privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDWHgjeDNEnTnt9
NSsOgH5wNd5k8vNGV23fbNvHrQQlZG6jysILUk/NQAYiYuxlnvtIM23aYJvjw975
HZWx2fmkkalpQCxHaSqynsDVBVYwbOqt/MIredqncILcVR6Wh6uCLm2BdxIyk4lg
J9R1rfaBcJ2V47yQ6L9ieDAyp1CuFS3O2/+s0XYnPCOKaQJmf8enUY3SwSsmQ/Tq
hRrSNs+Ede5BCSy3I38v99ejVKdUu8gY5gIcVPgd6S4PH6Tsxkb8M6fsIPzyXrnJ
L9kf7ehDGQtiNLypIjlzH6wtJ+IxvkZt227NCyjCKrrBLStm/pzSSUrCTFFwgwzX
rMRD9gU3AgMBAAECggEAYzEByaBlalCs25m8axjyuhfygZCdS7pn/4fGHzATSiFH
MiDVmPoWVw7waJCsU/19CnssymxT+4V7b6uZdA13XZpPQZ+Fg8WADsSFr4mr3n4u
j9CWwR5PwZ7ZOKpEI9cRCJtqhn37U6vOidmZzrR7DIb3sf8RFY6FTuA/789cDHCQ
qg8zuiqNwWld/NJglDPuMS6Em4DnLT7N1KI5tjTW5bsIV1BmgT0lEk/OHFmcvCKc
ATKWDmWSCymCw2jAzDlU8uOsk/Dd/zyXsrWoeonjnYQ8CbDwZZ0sp1SqJ9LDeqaA
mM/aHRuxoffL+2sX1v+j8Yb2YGEB2YF+w/Be2C/XpQKBgQD9xEnSAaiMP21Uv1RV
PVH6m3tuZKaN43PEbkMkOD5n9C2GPSSu11r1RL1Btv3kvtrFu9lhr/ecj+2Z8l/9
xd79f6u+l89mxuas9pFHWGRmhOXKSFuzPeHbSm5Gpo6nnzNuVK6A4i27Q7GMcd8V
JAsHrY4uc9kQPnNYTuRY2XU3NQKBgQDYAGuE+YdcfQUGxZR8RGW5EeJ16JmRvu68
6IqCZofKPABUMnKmAU/dm17OVP/UX/qIIFNQczbxIMiWLLKZM48OqbM8Qdg5qDpq
uBKLweBL0jGa+nbMhtlK7O2sRCaZ/WFaM5snOMHbc0WkAqhNlUpMQGa9ntvcON4G
l0joitacOwKBgHTmLVNurCQfO9Aka0bw/ojBgzSxbQBD3RqJ6KgQuL7OfwItvG5G
ioId7kkNcRwkx0b7aAJWO2yF6OBYBNw0gKqqW4VrDYG88pqO4xHIqEeJxQlQF94U
Da0lNnOZWnHhJqIWpGR+zK5NWsbl1ew5NFOPIcZIW5/eBOiTPyGm2xZZAoGAHbxB
EPdA+SyEyp/chxbrYgTiRhUVPwkn2H2yw6zVuLN14CFpwwyfMAS5knIFHflwhdjd
X0/dGmjG9FWG6Kw+X2hhMkRmPdm44QQiGXdBJ27yQUGFpTZTJ4tiVLq1DbHh+wbr
rwSTO2CtD50GClgo+EJNYoFCBxkVB5dABDNIxA0CgYEAjw521zCbE+7Rfzr1KoyI
MF3KX41zQ5I/GClg5Cr0Grj5CdsYoM8dG7YpiZxg/oa1dzw/N0RNDUEAHSrzQmUe
7WGTpVYTTMsnJmVDVqyeivlgSUes9u/7c/5VYhcgq5nf8RFJempQSLVoxmHHM7Td
NSauxk8ngHOwuFlaHkF2jqo=
-----END PRIVATE KEY-----`;
  }

  // Generate JWT token for authentication
  async getAccessToken() {
    try {
      if (
        this.accessToken &&
        this.tokenExpiry &&
        Date.now() < this.tokenExpiry
      ) {
        return this.accessToken;
      }

      const header = {
        alg: "RS256",
        typ: "JWT",
      };

      const now = Math.floor(Date.now() / 1000);
      const claim = {
        iss: this.clientEmail,
        scope: "https://www.googleapis.com/auth/spreadsheets",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      };

      const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
      const encodedClaim = this.base64UrlEncode(JSON.stringify(claim));
      const signatureInput = `${encodedHeader}.${encodedClaim}`;

      const signature = await this.signJWT(signatureInput, this.privateKey);
      const jwt = `${signatureInput}.${signature}`;

      const response = await axios.post("https://oauth2.googleapis.com/token", {
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;
      return this.accessToken;
    } catch (error) {
      console.error("Error getting access token:", error);
      throw error;
    }
  }

  base64UrlEncode(str) {
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  async signJWT(input, privateKeyPem) {
    try {
      const privateKey = await this.importPrivateKey(privateKeyPem);
      const encoder = new TextEncoder();
      const signature = await crypto.subtle.sign(
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: { name: "SHA-256" },
        },
        privateKey,
        encoder.encode(input),
      );

      return this.base64UrlEncode(
        String.fromCharCode(...new Uint8Array(signature)),
      );
    } catch (error) {
      console.error("Error signing JWT:", error);
      throw error;
    }
  }

  async importPrivateKey(pem) {
    const pemContents = pem
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\s/g, "");

    const binaryDer = Uint8Array.from(atob(pemContents), (c) =>
      c.charCodeAt(0),
    );

    return await crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: { name: "SHA-256" },
      },
      false,
      ["sign"],
    );
  }

  async init() {
    if (this.isInitialized) return true;

    try {
      await this.getAccessToken();
      this.isInitialized = true;
      console.log("✅ Google Sheets service initialized");
      return true;
    } catch (error) {
      console.error("❌ Init error:", error);
      return false;
    }
  }

  async request(method, url, data = null) {
    const token = await this.getAccessToken();

    const config = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  }

  // Get all data from sheet (returns array of arrays or objects)
  async getAllData(sheetTitle, range = "A:Z", returnAsObjects = true) {
    await this.init();

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${sheetTitle}!${range}`;
      const data = await this.request("GET", url);

      const rows = data.values || [];
      if (rows.length === 0) return [];

      if (!returnAsObjects) {
        return rows;
      }

      const headers = rows[0];
      const result = [];

      for (let i = 1; i < rows.length; i++) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = rows[i][index] || "";
        });
        result.push(row);
      }

      return result;
    } catch (error) {
      console.error("Error getting all data:", error);
      return [];
    }
  }

  // Get raw data as array of arrays
  async getRawData(sheetTitle, range = "A:Z") {
    await this.init();

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${sheetTitle}!${range}`;
      const data = await this.request("GET", url);
      return data.values || [];
    } catch (error) {
      console.error("Error getting raw data:", error);
      return [];
    }
  }

  // Write data to a specific range
  async writeData(range, values) {
    await this.init();

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

      const data = await this.request("PUT", url, {
        values: values,
      });

      return {
        success: true,
        message: "Data written successfully",
        updatedRange: data.updatedRange,
        updatedRows: data.updatedRows,
        updatedColumns: data.updatedColumns,
        updatedCells: data.updatedCells,
      };
    } catch (error) {
      console.error("Error writing data:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Update single cell
  async updateCell(range, value) {
    return this.writeData(range, [[value]]);
  }

  // Append data to sheet
  async appendData(sheetTitle, values) {
    await this.init();

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${sheetTitle}!A:Z:append?valueInputOption=USER_ENTERED`;

      const data = await this.request("POST", url, {
        values: values,
      });

      return {
        success: true,
        message: "Data appended successfully",
        updates: data.updates,
      };
    } catch (error) {
      console.error("Error appending data:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Clear a range
  async clearRange(range) {
    await this.init();

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${range}:clear`;

      const data = await this.request("POST", url, {});

      return {
        success: true,
        message: "Range cleared successfully",
      };
    } catch (error) {
      console.error("Error clearing range:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Check if sheet exists
  async sheetExists(sheetName) {
    await this.init();

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}`;
      const data = await this.request("GET", url);

      const sheets = data.sheets || [];
      return sheets.some((sheet) => sheet.properties.title === sheetName);
    } catch (error) {
      console.error("Error checking sheet existence:", error);
      return false;
    }
  }

  // Get row count (excluding header)
  async getRowCount(sheetTitle) {
    try {
      const data = await this.getRawData(sheetTitle, "A:A");
      return Math.max(0, data.length - 1);
    } catch (error) {
      console.error("Error getting row count:", error);
      return 0;
    }
  }

  // Get latest information from Informasi sheet
  async getLatestInfo() {
    await this.init();

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Informasi!A2:C`;
      const data = await this.request("GET", url);

      const rows = data.values || [];
      if (rows.length > 0 && rows[0].length >= 2) {
        return {
          judul: rows[0][1]?.toString() || "Informasi",
          pesan: rows[0][2]?.toString() || "Tidak ada pesan",
        };
      }

      return {
        judul: "Informasi",
        pesan: "Tidak ada informasi",
      };
    } catch (error) {
      console.error("Error getting latest info:", error);
      return {
        judul: "Error",
        pesan: "Gagal memuat informasi",
      };
    }
  }

  // Update latest information
  async updateLatestInfo(judul, pesan) {
    await this.init();

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Informasi!B2:C2?valueInputOption=USER_ENTERED`;

      const data = await this.request("PUT", url, {
        values: [[judul, pesan]],
      });

      return {
        success: true,
        message: "Info updated successfully",
      };
    } catch (error) {
      console.error("Error updating info:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

const sheetsService = new GoogleSheetsService();
export default sheetsService;
