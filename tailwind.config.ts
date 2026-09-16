import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          50: "hsl(4 100% 97%)",
          100: "hsl(4 95% 93%)",
          500: "hsl(4 100% 50%)",
          600: "hsl(4 83% 48%)",
          700: "hsl(4 83% 43%)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        chart: {
          "1": "hsl(var(--chart-1) / <alpha-value>)",
          "2": "hsl(var(--chart-2) / <alpha-value>)",
          "3": "hsl(var(--chart-3) / <alpha-value>)",
          "4": "hsl(var(--chart-4) / <alpha-value>)",
          "5": "hsl(var(--chart-5) / <alpha-value>)",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          primary: "hsl(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent: "hsl(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
        },
        /* ── Skala abu netral dari prototipe OneTalent ──────────────────────
           96% warna di aplikasi ditulis hardcode (text-gray-500, bg-gray-50,
           border-gray-200 — 15.170 pemakaian di 265 berkas), sehingga mengubah
           token shadcn saja tidak mengubah tampilan. Keluarga abu bawaan Tailwind
           dipetakan ulang ke skala netral prototipe, jadi seluruh kelas yang SUDAH
           ADA langsung ikut berubah tanpa menyentuh berkas halaman.

           Acuan prototipe: --surface #F4F4F4 · --surface-hi #E8E8E8 · --line #E0E0E0
           --line-strong #C2C2C2 · --text-muted #757575 · --text-mid #575757
           --text #1F1F1F · --text-hi #0A0A0A
           Tailwind bawaan condong kebiruan; skala ini benar-benar netral. */
        gray: {
          50: "#FAFAFA", 100: "#F4F4F4", 200: "#E8E8E8", 300: "#E0E0E0",
          400: "#C2C2C2", 500: "#757575", 600: "#575757", 700: "#2A2A2A",
          800: "#1E1E1E", 900: "#141414", 950: "#0A0A0A",
        },
        slate: {
          50: "#FAFAFA", 100: "#F4F4F4", 200: "#E8E8E8", 300: "#E0E0E0",
          400: "#C2C2C2", 500: "#757575", 600: "#575757", 700: "#2A2A2A",
          800: "#1E1E1E", 900: "#141414", 950: "#0A0A0A",
        },
        zinc: {
          50: "#FAFAFA", 100: "#F4F4F4", 200: "#E8E8E8", 300: "#E0E0E0",
          400: "#C2C2C2", 500: "#757575", 600: "#575757", 700: "#2A2A2A",
          800: "#1E1E1E", 900: "#141414", 950: "#0A0A0A",
        },
        neutral: {
          50: "#FAFAFA", 100: "#F4F4F4", 200: "#E8E8E8", 300: "#E0E0E0",
          400: "#C2C2C2", 500: "#757575", 600: "#575757", 700: "#2A2A2A",
          800: "#1E1E1E", 900: "#141414", 950: "#0A0A0A",
        },
        stone: {
          50: "#FAFAFA", 100: "#F4F4F4", 200: "#E8E8E8", 300: "#E0E0E0",
          400: "#C2C2C2", 500: "#757575", 600: "#575757", 700: "#2A2A2A",
          800: "#1E1E1E", 900: "#141414", 950: "#0A0A0A",
        },

        /* ── Warna HIASAN dinetralkan ─────────────────────────────────────────
           Prototipe memakai warna hanya untuk MAKNA, tidak untuk hiasan. Keluarga
           di bawah ini tidak punya arti baku di aplikasi keselamatan — ia dipakai
           sekadar mempercantik kartu & grafik (958 pemakaian di banyak halaman).
           Dipetakan ke skala netral yang sama, jadi seluruhnya ikut tenang tanpa
           menyentuh satu pun berkas halaman.

           Yang SENGAJA DIBIARKAN berwarna karena bermakna:
             merah  = bahaya / kedaluwarsa    hijau = aman / aktif
             kuning & oranye = peringatan     (biru TIDAK dipakai) */
        purple: {
          50: "#FAFAFA", 100: "#F4F4F4", 200: "#E8E8E8", 300: "#E0E0E0",
          400: "#C2C2C2", 500: "#757575", 600: "#575757", 700: "#2A2A2A",
          800: "#1E1E1E", 900: "#141414", 950: "#0A0A0A",
        },
        indigo: {
          50: "#FAFAFA", 100: "#F4F4F4", 200: "#E8E8E8", 300: "#E0E0E0",
          400: "#C2C2C2", 500: "#757575", 600: "#575757", 700: "#2A2A2A",
          800: "#1E1E1E", 900: "#141414", 950: "#0A0A0A",
        },
        violet: {
          50: "#FAFAFA", 100: "#F4F4F4", 200: "#E8E8E8", 300: "#E0E0E0",
          400: "#C2C2C2", 500: "#757575", 600: "#575757", 700: "#2A2A2A",
          800: "#1E1E1E", 900: "#141414", 950: "#0A0A0A",
        },
        fuchsia: {
          50: "#FAFAFA", 100: "#F4F4F4", 200: "#E8E8E8", 300: "#E0E0E0",
          400: "#C2C2C2", 500: "#757575", 600: "#575757", 700: "#2A2A2A",
          800: "#1E1E1E", 900: "#141414", 950: "#0A0A0A",
        },
        pink: {
          50: "#FAFAFA", 100: "#F4F4F4", 200: "#E8E8E8", 300: "#E0E0E0",
          400: "#C2C2C2", 500: "#757575", 600: "#575757", 700: "#2A2A2A",
          800: "#1E1E1E", 900: "#141414", 950: "#0A0A0A",
        },
        sky: {
          50: "#FAFAFA", 100: "#F4F4F4", 200: "#E8E8E8", 300: "#E0E0E0",
          400: "#C2C2C2", 500: "#757575", 600: "#575757", 700: "#2A2A2A",
          800: "#1E1E1E", 900: "#141414", 950: "#0A0A0A",
        },
        cyan: {
          50: "#FAFAFA", 100: "#F4F4F4", 200: "#E8E8E8", 300: "#E0E0E0",
          400: "#C2C2C2", 500: "#757575", 600: "#575757", 700: "#2A2A2A",
          800: "#1E1E1E", 900: "#141414", 950: "#0A0A0A",
        },
        teal: {
          50: "#FAFAFA", 100: "#F4F4F4", 200: "#E8E8E8", 300: "#E0E0E0",
          400: "#C2C2C2", 500: "#757575", 600: "#575757", 700: "#2A2A2A",
          800: "#1E1E1E", 900: "#141414", 950: "#0A0A0A",
        },

        /* biru: prototipe TIDAK memakai biru sama sekali. Di HR ia jadi warna
           paling sering (156 pemakaian) padahal hanya menghias kartu, ikon judul,
           dan tombol — bukan menandai informasi. Ikut dinetralkan. */
        blue: {
          50: "#FAFAFA", 100: "#F4F4F4", 200: "#E8E8E8", 300: "#E0E0E0",
          400: "#C2C2C2", 500: "#757575", 600: "#575757", 700: "#2A2A2A",
          800: "#1E1E1E", 900: "#141414", 950: "#0A0A0A",
        },

        /* ── SATU MAKNA, SATU WARNA ───────────────────────────────────────────
           Sebelumnya "peringatan" ditulis dengan TIGA keluarga berbeda
           (yellow / orange / amber) dan "aman" dengan DUA (green / emerald),
           sehingga dua halaman yang memaksudkan hal sama tampil beda warna.
           Keluarga kembar dipetakan ke nilai satu keluarga induk. */
        yellow: {
          50: "#FFFBEB", 100: "#FEF3C7", 200: "#FDE68A", 300: "#FCD34D",
          400: "#FBBF24", 500: "#F59E0B", 600: "#D97706", 700: "#B45309",
          800: "#92400E", 900: "#78350F", 950: "#451A03",
        },
        orange: {
          50: "#FFFBEB", 100: "#FEF3C7", 200: "#FDE68A", 300: "#FCD34D",
          400: "#FBBF24", 500: "#F59E0B", 600: "#D97706", 700: "#B45309",
          800: "#92400E", 900: "#78350F", 950: "#451A03",
        },
        emerald: {
          50: "#F0FDF4", 100: "#DCFCE7", 200: "#BBF7D0", 300: "#86EFAC",
          400: "#4ADE80", 500: "#22C55E", 600: "#16A34A", 700: "#15803D",
          800: "#166534", 900: "#14532D", 950: "#052E16",
        },
        rose: {
          50: "#FEF2F2", 100: "#FEE2E2", 200: "#FECACA", 300: "#FCA5A5",
          400: "#F87171", 500: "#EF4444", 600: "#DC2626", 700: "#B91C1C",
          800: "#991B1B", 900: "#7F1D1D", 950: "#450A0A",
        },


      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "hsl(var(--radix-accordion-content-height) / <alpha-value>)",
          },
        },
        "accordion-up": {
          from: {
            height: "hsl(var(--radix-accordion-content-height) / <alpha-value>)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
