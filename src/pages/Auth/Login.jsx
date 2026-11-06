import React, { useEffect, useRef, useState, useCallback } from "react";
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
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const usernameRef = useRef(null);
  const timerRef = useRef([]);
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);
  const cardRef = useRef(null);

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

  const handleCardMove = useCallback(
    (e) => {
      if (reduceMotion || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({ x: py * -8, y: px * 10 });
    },
    [reduceMotion],
  );

  const resetTilt = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  return (
    <main
      className={`rjpu-login relative isolate min-h-[100svh] overflow-hidden font-sans perspective-[1200px] ${
        isLit ? "bg-[#050912]" : "bg-[#090d18]"
      }`}
    >
      <style>{`
        @keyframes rjpu-cord-pull {
          0%   { transform: translateY(0) rotate(0deg); }
          35%  { transform: translateY(30px) rotate(1.5deg); }
          65%  { transform: translateY(18px) rotate(-1deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        @keyframes rjpu-cord-idle {
          0%,100% { transform: rotate(-1.6deg); }
          50%     { transform: rotate(1.6deg); }
        }
        @keyframes rjpu-bulb-swing {
          0%,100% { transform: rotate(-2deg); }
          50%     { transform: rotate(2deg); }
        }
        @keyframes rjpu-glow {
          0%   { opacity: 0; transform: scale(0.55); }
          45%  { opacity: 1; transform: scale(1.18); }
          100% { opacity: 0.85; transform: scale(1); }
        }
        @keyframes rjpu-reveal {
          from { opacity: 0; transform: translateY(30px) rotateX(10deg) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) rotateX(0deg) scale(1); }
        }
        @keyframes rjpu-breathe {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-7px); }
        }
        @keyframes rjpu-floor-glow {
          0%,100% { opacity: .35; transform: scaleX(1); }
          50%     { opacity: .65; transform: scaleX(1.08); }
        }
        @keyframes rjpu-twinkle {
          0%,100% { opacity: .15; }
          50%     { opacity: .9; }
        }
        @keyframes rjpu-smoke {
          0%   { transform: translateY(0) scale(1); opacity: 0; }
          30%  { opacity: .25; }
          100% { transform: translateY(-40px) scale(1.6); opacity: 0; }
        }
        @keyframes rjpu-flow {
          0%   { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -24; }
        }
        @keyframes rjpu-moon-glow {
          0%,100% { opacity: .35; }
          50%     { opacity: .6; }
        }
        .rjpu-login { transition: background-color 900ms ease; }
        .rjpu-pulling { animation: rjpu-cord-pull 340ms cubic-bezier(.2,.75,.25,1); }
        .rjpu-cord-idle { animation: rjpu-cord-idle 3.6s ease-in-out infinite; transform-origin: top center; }
        .rjpu-bulb-swing { animation: rjpu-bulb-swing 4.4s ease-in-out infinite; transform-origin: top center; }
        .rjpu-reveal { animation: rjpu-reveal 780ms cubic-bezier(.18,.8,.2,1) both; }
        .rjpu-glow { animation: rjpu-glow 900ms ease-out both; }
        .rjpu-breathe { animation: rjpu-breathe 4s ease-in-out infinite; }
        .rjpu-floor-glow { animation: rjpu-floor-glow 3s ease-in-out infinite; }
        .rjpu-twinkle { animation: rjpu-twinkle 3.6s ease-in-out infinite; }
        .rjpu-smoke { animation: rjpu-smoke 4s ease-out infinite; }
        .rjpu-flow { stroke-dasharray: 6 6; animation: rjpu-flow 1.2s linear infinite; }
        .rjpu-moon-glow { animation: rjpu-moon-glow 5s ease-in-out infinite; }
        .rjpu-card-3d { transform-style: preserve-3d; will-change: transform; }
        .rjpu-tilt { transition: transform 260ms ease-out; }
        @media(prefers-reduced-motion:reduce){
          .rjpu-login,.rjpu-login *{
            animation-duration:.01ms!important;
            animation-iteration-count:1!important;
            transition-duration:.01ms!important
          }
        }
      `}</style>

      {/* Dark ambient background */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${
          isLit ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_10%,#1c2942_0%,#0d1424_45%,#090d18_85%)]" />
        <div className="absolute inset-0 opacity-[.13] [background-image:linear-gradient(#93a4c522_1px,transparent_1px),linear-gradient(90deg,#93a4c522_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="absolute inset-0 opacity-40">
          {[...Array(14)].map((_, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-amber-200/20 blur-[1px]"
              style={{
                width: `${2 + (i % 4)}px`,
                height: `${2 + (i % 4)}px`,
                left: `${(i * 37) % 100}%`,
                top: `${(i * 53) % 100}%`,
                animation: `rjpu-breathe ${5 + (i % 5)}s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ===== SUASANA MALAM PEMBANGKIT (background area form) ===== */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${
          isLit ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Langit malam */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#04070f_0%,#081326_38%,#0d1f38_68%,#0a1626_100%)]" />

        {/* Bulan + glow */}
        <div className="absolute right-[12%] top-[10%]">
          <div className="rjpu-moon-glow absolute -inset-10 rounded-full bg-slate-200/10 blur-3xl" />
          <div className="relative h-16 w-16 rounded-full bg-[radial-gradient(circle_at_35%_30%,#f4f7ff,#cfd9ee_55%,#9fb0cf_100%)] shadow-[0_0_45px_12px_rgba(226,232,240,.25)]">
            <div className="absolute left-3 top-4 h-2 w-2 rounded-full bg-slate-400/40" />
            <div className="absolute left-8 top-8 h-1.5 w-1.5 rounded-full bg-slate-400/35" />
            <div className="absolute left-9 top-3 h-1 w-1 rounded-full bg-slate-400/30" />
          </div>
        </div>

        {/* Bintang berkelip */}
        {[...Array(40)].map((_, i) => (
          <span
            key={i}
            className="rjpu-twinkle absolute rounded-full bg-white"
            style={{
              width: `${1 + (i % 2)}px`,
              height: `${1 + (i % 2)}px`,
              left: `${(i * 53) % 100}%`,
              top: `${(i * 29) % 60}%`,
              animationDelay: `${(i % 7) * 0.4}s`,
            }}
          />
        ))}

        {/* Silhouette pembangkit listrik di horizon */}
        <div className="absolute inset-x-0 bottom-0 h-[46%]">
          {/* Kabut/glow di kaki pembangkit */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(ellipse_at_50%_100%,rgba(120,160,220,.18),transparent_70%)] blur-md" />

          <svg
            viewBox="0 0 1440 420"
            preserveAspectRatio="none"
            className="absolute bottom-0 h-full w-full"
            role="img"
            aria-label="Silhouette pembangkit listrik di malam hari"
          >
            <defs>
              <linearGradient id="nightGround" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0a1424" />
                <stop offset="100%" stopColor="#04070f" />
              </linearGradient>
              <radialGradient id="nightWin" cx="50%" cy="40%" r="70%">
                <stop offset="0%" stopColor="#ffe6a3" />
                <stop offset="100%" stopColor="#e09a2a" />
              </radialGradient>
            </defs>

            {/* Tanah */}
            <path
              d="M0 300 L1440 300 L1440 420 L0 420 Z"
              fill="url(#nightGround)"
            />

            {/* Gedung utama kiri */}
            <g fill="#0c182c">
              <rect x="70" y="235" width="220" height="90" rx="3" />
              <polygon points="62,238 290,238 268,220 84,220" />
            </g>

            {/* Cerobong 1 */}
            <g fill="#0b1628">
              <rect x="120" y="150" width="24" height="90" rx="2" />
              <rect x="116" y="144" width="32" height="9" rx="2" />
            </g>
            {/* Asap cerobong 1 */}
            <g className="rjpu-smoke" style={{ animationDelay: "0s" }}>
              <circle cx="132" cy="132" r="10" fill="rgba(160,185,220,.22)" />
              <circle cx="140" cy="112" r="14" fill="rgba(160,185,220,.16)" />
              <circle cx="128" cy="92" r="12" fill="rgba(160,185,220,.10)" />
            </g>

            {/* Cerobong 2 */}
            <g fill="#0b1628">
              <rect x="230" y="175" width="20" height="65" rx="2" />
              <rect x="226" y="169" width="28" height="8" rx="2" />
            </g>
            <g className="rjpu-smoke" style={{ animationDelay: "1.6s" }}>
              <circle cx="240" cy="158" r="9" fill="rgba(160,185,220,.20)" />
              <circle cx="248" cy="140" r="12" fill="rgba(160,185,220,.14)" />
              <circle cx="238" cy="122" r="10" fill="rgba(160,185,220,.09)" />
            </g>

            {/* Gedung utama kanan (lebih besar, menyatu dengan area form) */}
            <g fill="#0b1527">
              <rect x="520" y="210" width="360" height="115" rx="4" />
              <polygon points="512,214 888,214 860,190 540,190" />
            </g>
            {/* Cerobong besar */}
            <g fill="#0a1425">
              <rect x="560" y="95" width="34" height="125" rx="3" />
              <rect x="554" y="86" width="46" height="12" rx="2" />
            </g>
            <g className="rjpu-smoke" style={{ animationDelay: "0.8s" }}>
              <circle cx="577" cy="72" r="14" fill="rgba(160,185,220,.22)" />
              <circle cx="588" cy="48" r="18" fill="rgba(160,185,220,.15)" />
              <circle cx="572" cy="24" r="15" fill="rgba(160,185,220,.09)" />
            </g>
            <g fill="#0a1425">
              <rect x="800" y="120" width="28" height="100" rx="3" />
              <rect x="794" y="112" width="40" height="11" rx="2" />
            </g>
            <g className="rjpu-smoke" style={{ animationDelay: "2.4s" }}>
              <circle cx="814" cy="98" r="12" fill="rgba(160,185,220,.20)" />
              <circle cx="824" cy="76" r="15" fill="rgba(160,185,220,.13)" />
              <circle cx="810" cy="54" r="12" fill="rgba(160,185,220,.08)" />
            </g>

            {/* Menara pendingin */}
            <g fill="#0a1425">
              <polygon points="380,325 410,205 470,205 500,325" />
              <polygon points="410,205 470,205 458,190 422,190" />
            </g>
            <g className="rjpu-smoke" style={{ animationDelay: "1.2s" }}>
              <circle cx="440" cy="176" r="12" fill="rgba(160,185,220,.18)" />
              <circle cx="452" cy="156" r="15" fill="rgba(160,185,220,.12)" />
            </g>

            {/* Jendela menyala gedung kanan */}
            {[540, 580, 620, 660, 700, 740, 780, 820].map((x) => (
              <rect
                key={x}
                x={x}
                y="230"
                width="22"
                height="26"
                rx="2"
                fill="url(#nightWin)"
                opacity="0.85"
              />
            ))}
            {[540, 580, 620, 660, 700, 740, 780, 820].map((x) => (
              <rect
                key={`row2-${x}`}
                x={x}
                y="272"
                width="22"
                height="26"
                rx="2"
                fill="url(#nightWin)"
                opacity="0.5"
              />
            ))}
            {/* Jendela gedung kiri */}
            {[92, 126, 160, 194, 228, 262].map((x) => (
              <rect
                key={x}
                x={x}
                y="252"
                width="18"
                height="22"
                rx="2"
                fill="url(#nightWin)"
                opacity="0.65"
              />
            ))}

            {/* Tiang listrik + kabel */}
            <rect x="980" y="150" width="5" height="175" fill="#0a1425" />
            <rect x="964" y="158" width="38" height="5" rx="1" fill="#0a1425" />
            <rect x="972" y="196" width="22" height="4" rx="1" fill="#0a1425" />
            <path
              d="M968 162 Q980 190 986 196"
              fill="none"
              stroke="#0a1425"
              strokeWidth="2"
            />
            <path
              d="M1000 162 Q988 190 986 196"
              fill="none"
              stroke="#0a1425"
              strokeWidth="2"
            />

            {/* Aliran listrik berkilau */}
            <path
              d="M986 196 Q900 230 880 250"
              fill="none"
              stroke="#f6c453"
              strokeWidth="2"
              className="rjpu-flow"
              opacity="0.7"
            />
            <path
              d="M986 196 Q900 230 880 250"
              fill="none"
              stroke="#ffe9a8"
              strokeWidth="0.9"
              className="rjpu-flow"
            />

            {/* Tiang kedua */}
            <rect x="1180" y="180" width="4" height="145" fill="#0a1425" />
            <rect
              x="1164"
              y="188"
              width="36"
              height="4"
              rx="1"
              fill="#0a1425"
            />
            <path
              d="M1168 192 Q1180 218 1182 224"
              fill="none"
              stroke="#0a1425"
              strokeWidth="1.8"
            />
            <path
              d="M1196 192 Q1184 218 1182 224"
              fill="none"
              stroke="#0a1425"
              strokeWidth="1.8"
            />
            <path
              d="M1182 224 Q1080 250 986 196"
              fill="none"
              stroke="#f6c453"
              strokeWidth="1.6"
              className="rjpu-flow"
              opacity="0.5"
            />
          </svg>
        </div>

        {/* Sorot hangat dari arah lampu (kiri) */}
        <div className="absolute inset-y-0 left-0 w-[55%] bg-[radial-gradient(ellipse_at_0%_30%,rgba(255,214,140,.16),transparent_65%)]" />
      </div>

      <header
        className={`absolute left-5 right-5 top-5 z-20 flex items-center justify-between sm:left-10 sm:right-10 sm:top-8 ${
          isLit ? "text-white/70" : "text-white/70"
        }`}
      >
        <div className="flex items-center gap-2.5 text-xs font-semibold tracking-[.16em] sm:text-sm">
          <span
            className={`grid h-8 w-8 place-items-center rounded-xl transition-colors duration-700 ${
              isLit
                ? "bg-white/10 text-amber-300"
                : "bg-white/10 text-amber-300"
            }`}
          >
            <FiZap size={16} />
          </span>
          RJPU{" "}
          <span className="hidden font-normal tracking-normal opacity-70 sm:inline">
            / Planning Workspace
          </span>
        </div>
        <span
          className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-widest transition-colors duration-700 sm:text-xs ${
            isLit ? "border-white/15 bg-white/5" : "border-white/15 bg-white/5"
          }`}
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
            <div className="relative mb-8 flex h-[300px] w-full flex-col items-center justify-start perspective-[800px]">
              <div className="rjpu-breathe relative flex flex-col items-center [transform-style:preserve-3d]">
                <div className="h-20 w-[3px] rounded-full bg-gradient-to-b from-slate-500 to-slate-700 shadow-[0_0_8px_#0008]" />
                <div className="relative h-16 w-36 [transform-style:preserve-3d]">
                  <div className="absolute inset-0 rounded-t-[5rem] border border-slate-500/80 bg-gradient-to-b from-[#5b687d] via-[#2f3b50] to-[#0f1826] shadow-[0_18px_40px_#0007,inset_0_2px_6px_#ffffff33,inset_0_-8px_16px_#00000066]" />
                  <div className="absolute inset-x-6 top-2 h-4 rounded-full bg-white/15 blur-[3px]" />
                  <div className="absolute -bottom-1 left-1/2 h-3 w-28 -translate-x-1/2 rounded-full bg-gradient-to-b from-slate-500 to-slate-700 shadow-[0_6px_10px_#0006]" />
                </div>
                <div className="relative -mt-3 h-10 w-10 [transform-style:preserve-3d]">
                  <div className="rjpu-bulb-swing absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff7d6,#f6c453_45%,#a1701b_100%)] shadow-[0_0_25px_8px_#f6c45355,inset_-3px_-4px_8px_#00000055,inset_3px_3px_6px_#ffffffaa]" />
                  <div className="absolute left-1/2 top-1/2 h-3 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded bg-amber-100 shadow-[0_0_6px_2px_#fff3]" />
                </div>
                <div className="relative -mt-1 h-6 w-8 rounded-b-lg bg-gradient-to-b from-slate-400 via-slate-600 to-slate-800 shadow-inner" />
              </div>

              <div
                aria-hidden="true"
                className="rjpu-floor-glow absolute bottom-2 left-1/2 h-6 w-52 -translate-x-1/2 rounded-[50%] bg-amber-300/25 blur-xl"
              />

              <button
                type="button"
                onClick={turnOn}
                disabled={isPulling}
                aria-label="Tarik tali untuk menyalakan lampu dan membuka formulir login"
                className="group absolute left-[calc(50%+88px)] top-10 flex w-16 flex-col items-center rounded-xl py-2 outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-wait sm:left-[calc(50%+100px)]"
              >
                <span
                  aria-hidden="true"
                  className={`flex origin-top flex-col items-center ${
                    isPulling
                      ? "rjpu-pulling"
                      : "rjpu-cord-idle transition-transform duration-200 group-hover:translate-y-2 group-active:translate-y-5"
                  }`}
                >
                  <span className="h-32 w-[2px] bg-gradient-to-b from-slate-600 via-slate-400 to-slate-200 shadow-[0_0_4px_#0006]" />
                  <span className="relative h-8 w-3 rounded-full bg-gradient-to-r from-slate-400 via-white to-slate-500 shadow-[0_4px_8px_#0007,inset_-1px_0_2px_#ffffffcc,inset_1px_0_3px_#00000055]">
                    <span className="absolute left-1/2 top-1/2 h-4 w-[1px] -translate-x-1/2 -translate-y-1/2 bg-white/60" />
                  </span>
                </span>
              </button>
            </div>

            <span className="mb-4 rounded-full border border-amber-300/15 bg-amber-300/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[.22em] text-amber-200 backdrop-blur-sm">
              Welcome to RJPU
            </span>
            <h1 className="max-w-lg text-3xl font-semibold tracking-tight sm:text-[42px] sm:leading-tight">
              Rencana lebih terang,
              <br />
              <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(252,211,77,.35)]">
                dimulai dari sini.
              </span>
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-400 sm:text-base">
              Tarik tali lampu untuk membuka akses ke Rencana Jangka Panjang
              Unit.
            </p>
            <button
              type="button"
              onClick={turnOn}
              disabled={isPulling}
              className="mt-8 flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_#000a,inset_0_1px_0_#ffffff22] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-amber-300/50 hover:bg-white/15 hover:shadow-[0_16px_36px_-12px_#000c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 active:translate-y-0 disabled:opacity-60"
            >
              <FiZap className="text-amber-300" />{" "}
              {isPulling ? "Menyalakan lampu..." : "Nyalakan Lampu"}{" "}
              <FiArrowRight className="transition-transform group-hover:translate-x-1" />
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
            style={{ perspective: "1200px" }}
          >
            <div
              ref={cardRef}
              onMouseMove={handleCardMove}
              onMouseLeave={resetTilt}
              className="rjpu-card-3d rjpu-tilt"
              style={{
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(0)`,
              }}
            >
              <div className="relative rounded-[28px] border border-white/10 bg-[#0c1524]/70 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,.85),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-xl sm:p-9">
                {/* Glow aksen lembut di belakang kartu */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-px -z-10 rounded-[28px] bg-gradient-to-br from-amber-200/25 via-transparent to-blue-400/20 opacity-70 blur-md"
                />
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-[22px] border border-amber-200/20 bg-gradient-to-br from-[#1b2334] to-[#0c121e] shadow-[0_10px_24px_-12px_rgba(0,0,0,.9),inset_0_1px_0_rgba(255,255,255,.08)] [transform:translateZ(28px)]">
                    <img
                      src={LogoWeb}
                      alt="Logo RJPU"
                      className="h-14 w-14 object-contain drop-shadow-[0_0_12px_rgba(246,196,83,.35)]"
                    />
                  </div>
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
                    <FiCheckCircle /> Secure Workspace
                  </div>
                  <h1
                    id="login-title"
                    className="text-[25px] font-bold tracking-tight text-white"
                  >
                    Selamat datang kembali
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Masuk ke sistem Rencana Jangka Panjang Unit
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="rjpu-username"
                      className="mb-2 block text-xs font-semibold text-slate-300"
                    >
                      Username
                    </label>
                    <div className="group relative">
                      <FiUser
                        aria-hidden="true"
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-amber-300"
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
                        className="w-full rounded-xl border border-white/10 bg-white/[.04] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition-all duration-200 placeholder:text-slate-500 hover:border-white/20 focus:border-amber-300/60 focus:bg-white/[.07] focus:shadow-[0_6px_18px_-8px_rgba(246,196,83,.5)] focus:ring-4 focus:ring-amber-300/10 disabled:opacity-60"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="rjpu-password"
                      className="mb-2 block text-xs font-semibold text-slate-300"
                    >
                      Password
                    </label>
                    <div className="group relative">
                      <FiLock
                        aria-hidden="true"
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-amber-300"
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
                        className="w-full rounded-xl border border-white/10 bg-white/[.04] py-3.5 pl-11 pr-12 text-sm text-white outline-none transition-all duration-200 placeholder:text-slate-500 hover:border-white/20 focus:border-amber-300/60 focus:bg-white/[.07] focus:shadow-[0_6px_18px_-8px_rgba(246,196,83,.5)] focus:ring-4 focus:ring-amber-300/10 disabled:opacity-60"
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
                        className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
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
                      className="flex items-start gap-2.5 rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-3 text-xs leading-5 text-red-300"
                    >
                      <FiAlertCircle className="mt-0.5 shrink-0" size={16} />
                      <span>{error}</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-5 py-3.5 text-sm font-bold text-[#20160a] shadow-[0_12px_24px_-10px_rgba(246,196,83,.8),inset_0_1px_0_rgba(255,255,255,.5)] transition-all duration-200 hover:-translate-y-0.5 hover:from-amber-200 hover:to-amber-400 hover:shadow-[0_18px_32px_-12px_rgba(246,196,83,.9)] active:translate-y-0 active:scale-[.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/40 disabled:cursor-wait disabled:opacity-65"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black/80" />{" "}
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
                <p className="mt-6 text-center text-xs leading-5 text-slate-500">
                  Akses hanya untuk pengguna yang memiliki izin.
                </p>
              </div>
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
