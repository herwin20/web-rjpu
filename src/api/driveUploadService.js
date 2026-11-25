const MAX_SIZE = 15 * 1024 * 1024;

async function uploadFileToDrive(file, programName) {
  let timer;
  try {
    const url = String(
      "https://script.google.com/macros/s/AKfycbzoMleb30iqS1ejng2agTL-OzRu9FfD-tCHjW0DwaiRvkwQEqvUxGI2DvixcPmBcLIbbw/exec",
    ).trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) {
      throw new Error("Konfigurasi VITE_GAS_UPLOAD_URL belum valid");
    }
    if (!file || !file.size) throw new Error("File kosong atau belum dipilih");
    if (file.size > MAX_SIZE) throw new Error("Ukuran file maksimal 15 MB");
    if (!String(programName || "").trim())
      throw new Error("Nama program wajib diisi");
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("Gagal membaca file"));
      reader.onabort = () => reject(new Error("Pembacaan file dibatalkan"));
      reader.readAsDataURL(file);
    });
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), 120000);
    const response = await fetch(url, {
      method: "POST",
      redirect: "follow",
      credentials: "omit",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        base64,
        programName,
      }),
      signal: controller.signal,
    });
    const raw = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      throw new Error(
        "Respons bukan JSON. Periksa deployment dan akses Web App.",
      );
    }
    if (!result.success || !result.link)
      throw new Error(result.message || "Upload gagal");
    return result;
  } catch (error) {
    return {
      success: false,
      message:
        error.name === "AbortError"
          ? "Upload timeout. Cek Drive sebelum mengulang."
          : error.message,
    };
  } finally {
    clearTimeout(timer);
  }
}
export default { uploadFileToDrive };
