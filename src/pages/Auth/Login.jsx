import React, { useEffect, useRef, useState } from "react";
import loginService from "../../api/loginSheetService";
import {
  FiArrowRight,
  FiAlertCircle,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiLock,
  FiUser,
  FiZap,
} from "react-icons/fi";
import LogoWeb from "../../assets/logo.png";

const LoginPage = ({ onLogin }) => {
  const [phase, setPhase] = useState("dark"); // dark | pulling | lit
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reduceMotion, setReduceMotion] = useState(false);
  const usernameRef = useRef(null);
  const timerRef = useRef([]);
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);

  const isLit = phase === "lit";
  const isPulling = phase === "pulling";

  useEffect(() => {
    mountedRef.current = true;
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (query) {
      const sync = () => setReduceMotion(query.matches);
      sync();
      query.addEventListener?.("change", sync);
      return () => {
        mountedRef.current = false;
        query.removeEventListener?.("change", sync);
        timerRef.current.forEach(clearTimeout);
      };
    }
    return () => {
      mountedRef.current = false;
      timerRef.current.forEach(clearTimeout);
    };
  }, []);

  const schedule = (fn, ms) => {
    const id = window.setTimeout(fn, ms);
    timerRef.current.push(id);
  };

  const turnOn = () => {
    if (phase !== "dark") return;
    setError("");
    if (reduceMotion) {
      setPhase("lit");
      schedule(() => usernameRef.current?.focus(), 0);
      return;
    }
    setPhase("pulling");
    schedule(() => {
      if (!mountedRef.current) return;
      setPhase("lit");
      schedule(() => usernameRef.current?.focus(), 750);
    }, 340);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      setError("Isi username dan password terlebih dahulu.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await loginService.login(normalizedUsername, password);
      if (!mountedRef.current) return;
      if (result?.success && result?.user) {
        onLogin?.(result.user);
        return;
      }
      setError(result?.message || "Login gagal. Periksa kembali akun Anda.");
    } catch (err) {
      if (mountedRef.current) {
        setError(
          "Tidak dapat terhubung ke layanan. Periksa koneksi lalu coba lagi.",
        );
      }
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  };

  return (
    <main
      className={`rjpu-login relative isolate min-h-[100svh] overflow-hidden font-sans ${isLit ? "bg-[#f5f7fb]" : "bg-[#090d18]"}`}
    >
      <style>{`
        @keyframes rjpu-cord-pull {0%,100%{transform:translateY(0)}50%{transform:translateY(26px)}}
        @keyframes rjpu-glow {0%{opacity:.15;transform:scale(.7)}40%{opacity:1;transform:scale(1.1)}100%{opacity:1;transform:scale(1)}}
        @keyframes rjpu-reveal {from{opacity:0;transform:translateY(24px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes rjpu-breathe {0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        .rjpu-login{transition:background-color 850ms ease}
        .rjpu-pulling{animation:rjpu-cord-pull 340ms cubic-bezier(.2,.75,.25,1)}
        .rjpu-reveal{animation:rjpu-reveal 700ms cubic-bezier(.18,.8,.2,1) both}
        .rjpu-glow{animation:rjpu-glow 800ms ease-out both}
        .rjpu-breathe{animation:rjpu-breathe 4s ease-in-out infinite}
        @media(prefers-reduced-motion:reduce){.rjpu-login,.rjpu-login *{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
      `}</style>

      {/* Dark ambient background */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${isLit ? "opacity-0" : "opacity-100"}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_10%,#1c2942_0%,#0d1424_45%,#090d18_85%)]" />
        <div className="absolute inset-0 opacity-[.13] [background-image:linear-gradient(#93a4c522_1px,transparent_1px),linear-gradient(90deg,#93a4c522_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      {/* Warm illumination, no decorative image downloads */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${isLit ? "opacity-100" : "opacity-0"}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,#ffefd0_0%,#f7f8fc_42%,#edf2f9_100%)]" />
        <div className="absolute inset-0 opacity-[.18] [background-image:linear-gradient(#9ca3af22_1px,transparent_1px),linear-gradient(90deg,#9ca3af22_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <header
        className={`absolute left-5 right-5 top-5 z-20 flex items-center justify-between sm:left-10 sm:right-10 sm:top-8 ${isLit ? "text-slate-700" : "text-white/70"}`}
      >
        <div className="flex items-center gap-2.5 text-xs font-semibold tracking-[.16em] sm:text-sm">
          <span
            className={`grid h-8 w-8 place-items-center rounded-xl ${isLit ? "bg-blue-100 text-blue-700" : "bg-white/10 text-amber-300"}`}
          >
            <FiZap size={16} />
          </span>
          RJPU{" "}
          <span className="hidden font-normal tracking-normal opacity-70 sm:inline">
            / Planning Workspace
          </span>
        </div>
        <span
          className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-widest sm:text-xs ${isLit ? "border-slate-200 bg-white/80" : "border-white/15 bg-white/5"}`}
        >
          UNIT PLANNING
        </span>
      </header>

      <div className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-4 pb-14 pt-24 sm:px-6">
        {!isLit && (
          <section
            className="flex w-full max-w-lg flex-col items-center text-center text-white"
            aria-label="Nyalakan lampu untuk masuk"
          >
            <div className="relative mb-8 flex h-[255px] w-full flex-col items-center justify-start">
              <div className="rjpu-breathe relative flex flex-col items-center">
                <div className="h-24 w-[3px] rounded-full bg-gradient-to-b from-slate-500 to-slate-700" />
                <div className="relative h-16 w-36 overflow-hidden rounded-t-[5rem] border border-slate-600 bg-gradient-to-b from-[#566275] via-[#303b50] to-[#111a2b] shadow-[0_15px_35px_#0005]">
                  <div className="absolute inset-x-5 top-3 h-px bg-white/20" />
                </div>
                <div className="relative -mt-2 h-5 w-20 rounded-b-full border border-slate-600 bg-slate-800" />
                <div className="relative -mt-2 h-9 w-9 rounded-b-full rounded-t-xl bg-slate-600 shadow-inner" />
              </div>
              <button
                type="button"
                onClick={turnOn}
                disabled={isPulling}
                aria-label="Tarik tali untuk menyalakan lampu dan membuka formulir login"
                className="group absolute left-[calc(50%+88px)] top-12 flex w-16 flex-col items-center rounded-xl py-2 outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-wait sm:left-[calc(50%+100px)]"
              >
                <span
                  aria-hidden="true"
                  className={`flex flex-col items-center ${isPulling ? "rjpu-pulling" : "transition-transform duration-200 group-hover:translate-y-2 group-active:translate-y-5"}`}
                >
                  <span className="h-32 w-[2px] bg-gradient-to-b from-slate-600 to-slate-300" />
                  <span className="h-8 w-3 rounded-full bg-gradient-to-r from-slate-300 via-white to-slate-400 shadow-lg" />
                </span>
              </button>
            </div>
            <span className="mb-4 rounded-full border border-amber-300/15 bg-amber-300/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[.22em] text-amber-200">
              Welcome to RJPU
            </span>
            <h1 className="max-w-lg text-3xl font-semibold tracking-tight sm:text-[42px] sm:leading-tight">
              Rencana lebih terang,
              <br />
              <span className="text-amber-300">dimulai dari sini.</span>
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-400 sm:text-base">
              Tarik tali lampu untuk membuka akses ke Rencana Jangka Panjang
              Unit.
            </p>
            <button
              type="button"
              onClick={turnOn}
              disabled={isPulling}
              className="mt-8 flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-amber-300/50 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-60"
            >
              <FiZap className="text-amber-300" />{" "}
              {isPulling ? "Menyalakan lampu..." : "Nyalakan Lampu"}{" "}
              <FiArrowRight />
            </button>
            <span className="mt-4 text-xs text-slate-500">
              Klik tali atau tombol di atas
            </span>
          </section>
        )}

        {isLit && (
          <section
            className="rjpu-reveal w-full max-w-[440px]"
            aria-labelledby="login-title"
          >
            <div className="rounded-[28px] border border-white bg-white/90 p-6 shadow-[0_28px_75px_-35px_rgba(23,49,89,.28)] backdrop-blur-xl sm:p-9">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-[22px] border border-amber-100 bg-gradient-to-br from-amber-50 to-white shadow-sm">
                  <img
                    src={LogoWeb}
                    alt="Logo RJPU"
                    className="h-14 w-14 object-contain"
                  />
                </div>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  <FiCheckCircle /> Secure Workspace
                </div>
                <h1
                  id="login-title"
                  className="text-[25px] font-bold tracking-tight text-slate-900"
                >
                  Selamat datang kembali
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Masuk ke sistem Rencana Jangka Panjang Unit
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="rjpu-username"
                    className="mb-2 block text-xs font-semibold text-slate-700"
                  >
                    Username
                  </label>
                  <div className="relative">
                    <FiUser
                      aria-hidden="true"
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      ref={usernameRef}
                      id="rjpu-username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      maxLength={100}
                      disabled={loading}
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="Masukkan username"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/75 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="rjpu-password"
                    className="mb-2 block text-xs font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <FiLock
                      aria-hidden="true"
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="rjpu-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      disabled={loading}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="Masukkan password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/75 py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                      aria-pressed={showPassword}
                      className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {showPassword ? (
                        <FiEyeOff size={18} />
                      ) : (
                        <FiEye size={18} />
                      )}
                    </button>
                  </div>
                </div>
                {error && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-700"
                  >
                    <FiAlertCircle className="mt-0.5 shrink-0" size={16} />
                    <span>{error}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#195ed8] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_10px_22px_-10px_rgba(25,94,216,.8)] transition hover:bg-[#124eb9] hover:shadow-[0_14px_28px_-12px_rgba(25,94,216,.8)] active:scale-[.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 disabled:cursor-wait disabled:opacity-65"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />{" "}
                      Memverifikasi akun...
                    </>
                  ) : (
                    <>
                      Masuk ke Sistem{" "}
                      <FiArrowRight
                        className="transition-transform group-hover:translate-x-1"
                        size={17}
                      />
                    </>
                  )}
                </button>
              </form>
              <p className="mt-6 text-center text-xs leading-5 text-slate-400">
                Akses hanya untuk pengguna yang memiliki izin.
              </p>
            </div>
            <p className="mt-6 text-center text-[11px] text-slate-500">
              RJPU • Rencana Jangka Panjang Unit
            </p>
          </section>
        )}
      </div>
    </main>
  );
};

export default LoginPage;
