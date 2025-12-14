"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { create } from "zustand";
import {
  ArrowUpRight,
  BarChart3,
  Clapperboard,
  Download,
  Gauge,
  Link2,
  ListChecks,
  Plus,
  RefreshCcw,
  Settings2,
  Ticket,
  Trash2,
  Wand2,
} from "lucide-react";
import {
  differenceInCalendarMonths,
  format,
  isSameMonth,
  isSameWeek,
  isSameYear,
} from "date-fns";

type Period = "lifetime" | "year" | "month";

type Movie = {
  id: string;
  title: string;
  watchDate: string;
  letterboxdId?: string;
  isAMC: boolean;
  rating?: number;
  addedManually: boolean;
  notes?: string;
};

type UserSettings = {
  letterboxd: {
    username: string;
    lastSync: Date | null;
  };
  aList: {
    subscriptionCost: number;
    startDate: string;
    avgTicketPrice: number;
    isActive: boolean;
  };
  preferences: {
    defaultView: Period;
    currency: "USD";
    notifications: boolean;
  };
};

type SavingsBreakdown = {
  savings: number;
  monthsActive: number;
  amcCount: number;
  ticketValue: number;
};

type CalculatedStats = {
  lifetime: SavingsBreakdown;
  monthly: SavingsBreakdown;
  yearly: SavingsBreakdown;
  avgSavingsPerMovie: number;
  totalAMCMovies: number;
  monthsActive: number;
  weeklyFreeUsed: number;
  monthlyFreeUsed: number;
  utilizationRate: number;
  breakEvenMonths: number | null;
};

const weeklyQuota = 4;
const monthlyQuota = 12;

const demoSeedMovies: Movie[] = [
  {
    id: "m1",
    title: "Dune: Part Two",
    watchDate: "2024-11-09",
    letterboxdId: "dune-part-two",
    isAMC: true,
    rating: 4.5,
    addedManually: false,
    notes: "IMAX Laser",
  },
  {
    id: "m2",
    title: "Civil War",
    watchDate: "2024-12-02",
    letterboxdId: "civil-war",
    isAMC: true,
    rating: 4.0,
    addedManually: false,
    notes: "Prime",
  },
  {
    id: "m3",
    title: "Poor Things",
    watchDate: "2025-01-04",
    letterboxdId: "poor-things",
    isAMC: true,
    rating: 4.3,
    addedManually: false,
  },
  {
    id: "m4",
    title: "Inside Out 2",
    watchDate: "2025-01-11",
    letterboxdId: "inside-out-2",
    isAMC: true,
    rating: 3.9,
    addedManually: false,
  },
  {
    id: "m5",
    title: "The Zone of Interest",
    watchDate: "2024-10-18",
    letterboxdId: "zone-of-interest",
    isAMC: false,
    rating: 4.7,
    addedManually: false,
  },
  {
    id: "m6",
    title: "The Holdovers",
    watchDate: "2024-12-20",
    letterboxdId: "the-holdovers",
    isAMC: true,
    rating: 4.2,
    addedManually: false,
  },
  {
    id: "m7",
    title: "Godzilla Minus One",
    watchDate: "2024-12-27",
    letterboxdId: "godzilla-minus-one",
    isAMC: false,
    rating: 4.8,
    addedManually: false,
  },
  {
    id: "m8",
    title: "Anora",
    watchDate: "2025-01-16",
    letterboxdId: "anora",
    isAMC: true,
    rating: 4.6,
    addedManually: true,
    notes: "Date night",
  },
];

const demoSettingsTemplate: UserSettings = {
  letterboxd: {
    username: "cinefan",
    lastSync: new Date("2025-01-05T10:00:00"),
  },
  aList: {
    subscriptionCost: 23.95,
    startDate: "2024-04-15",
    avgTicketPrice: 18.5,
    isActive: true,
  },
  preferences: {
    defaultView: "lifetime",
    currency: "USD",
    notifications: true,
  },
};

const initialSettings: UserSettings = {
  letterboxd: {
    username: "",
    lastSync: null,
  },
  aList: {
    subscriptionCost: 25.99,
    startDate: "",
    avgTicketPrice: 18.5,
    isActive: false,
  },
  preferences: {
    defaultView: "lifetime",
    currency: "USD",
    notifications: true,
  },
};

const freshSettings = (): UserSettings => ({
  ...initialSettings,
  letterboxd: { ...initialSettings.letterboxd },
  aList: { ...initialSettings.aList },
  preferences: { ...initialSettings.preferences },
});

const demoSettings = (): UserSettings => ({
  ...demoSettingsTemplate,
  letterboxd: { ...demoSettingsTemplate.letterboxd },
  aList: { ...demoSettingsTemplate.aList },
  preferences: { ...demoSettingsTemplate.preferences },
});

const freshMovies = (): Movie[] => [];
const demoMovies = (): Movie[] => demoSeedMovies.map((movie) => ({ ...movie }));

const normalizeLetterboxdUsername = (username: string) =>
  username.replace(/^@/, "").trim();

const mergeMoviesWithExisting = (incoming: Movie[], existing: Movie[]) => {
  const existingById = new Map(existing.map((movie) => [movie.id, movie]));
  const incomingIds = new Set(incoming.map((movie) => movie.id));

  const mergedIncoming = incoming.map((movie) => {
    const prior = existingById.get(movie.id);
    if (!prior) return movie;
    return {
      ...movie,
      isAMC: prior.isAMC,
      addedManually: prior.addedManually,
      rating: movie.rating ?? prior.rating,
      notes: prior.notes,
    };
  });

  const preserved = existing.filter((movie) => !incomingIds.has(movie.id));
  return [...mergedIncoming, ...preserved];
};

type AListStore = {
  movies: Movie[];
  settings: UserSettings;
  setMovies: (updater: (prev: Movie[]) => Movie[]) => void;
  setSettings: (updater: (prev: UserSettings) => UserSettings) => void;
  reset: () => void;
};

const useAListStore = create<AListStore>((set) => ({
  movies: freshMovies(),
  settings: freshSettings(),
  setMovies: (updater) => set((state) => ({ movies: updater(state.movies) })),
  setSettings: (updater) =>
    set((state) => ({ settings: updater(state.settings) })),
  reset: () =>
    set({
      movies: freshMovies(),
      settings: freshSettings(),
    }),
}));

const moneyFormatter = (currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

const computePeriodStats = (
  period: Period,
  movies: Movie[],
  settings: UserSettings,
): SavingsBreakdown => {
  const now = new Date();
  const start = settings.aList.startDate ? new Date(settings.aList.startDate) : null;
  const safeStart = start && !Number.isNaN(start.getTime()) ? start : now;
  const amcMovies = movies.filter((movie) => movie.isAMC);
  const filtered = amcMovies.filter((movie) => {
    const date = new Date(movie.watchDate);
    if (period === "year") return isSameYear(date, now);
    if (period === "month") return isSameMonth(date, now);
    return true;
  });

  const periodStart = (() => {
    if (period === "lifetime") return safeStart;
    if (period === "year") {
      const beginningOfYear = new Date(now.getFullYear(), 0, 1);
      return safeStart > beginningOfYear ? safeStart : beginningOfYear;
    }
    const beginningOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return safeStart > beginningOfMonth ? safeStart : beginningOfMonth;
  })();

  const monthsActive = Math.max(
    settings.aList.isActive ? 1 : 0,
    settings.aList.isActive
      ? differenceInCalendarMonths(now, periodStart) + 1
      : 0,
  );

  const ticketValue = filtered.length * settings.aList.avgTicketPrice;
  const subscriptionCost =
    monthsActive * (settings.aList.isActive ? settings.aList.subscriptionCost : 0);
  const savings = settings.aList.isActive ? ticketValue - subscriptionCost : 0;

  return {
    savings,
    monthsActive,
    amcCount: filtered.length,
    ticketValue,
  };
};

const ProgressBar = ({
  value,
  max,
  color = "bg-[#000]",
}: {
  value: number;
  max: number;
  color?: string;
}) => {
  const width = Math.min(100, (value / max) * 100);
  return (
    <div className="h-3 w-full overflow-hidden rounded-full border-2 border-black bg-white">
      <div
        className={`h-full ${color}`}
        style={{ width: `${width}%`, transition: "width 200ms ease" }}
      />
    </div>
  );
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "movies" | "settings">(
    "dashboard",
  );
  const [viewMode, setViewMode] = useState<Period>(
    initialSettings.preferences.defaultView,
  );
  const { movies, settings, setMovies, setSettings, reset } = useAListStore();
  const [filter, setFilter] = useState<"all" | "amc" | "not">("all");
  const [sortBy, setSortBy] = useState<"date" | "title" | "savings">("date");
  const [newMovie, setNewMovie] = useState({
    title: "",
    watchDate: format(new Date(), "yyyy-MM-dd"),
    isAMC: true,
    rating: "",
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [sharePeriod, setSharePeriod] = useState<Period>("lifetime");
  const [sharePreview, setSharePreview] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const shareCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const latestAMCMovie = useMemo(() => {
    const amc = movies.filter((movie) => movie.isAMC);
    if (!amc.length) return null;
    return [...amc].sort(
      (a, b) => new Date(b.watchDate).getTime() - new Date(a.watchDate).getTime(),
    )[0];
  }, [movies]);

  const money = useMemo(
    () => moneyFormatter(settings.preferences.currency),
    [settings.preferences.currency],
  );

  const stats: CalculatedStats = useMemo(() => {
    const lifetime = computePeriodStats("lifetime", movies, settings);
    const monthly = computePeriodStats("month", movies, settings);
    const yearly = computePeriodStats("year", movies, settings);
    const amcMovies = movies.filter((movie) => movie.isAMC);
    const avgSavingsPerMovie =
      amcMovies.length > 0 ? lifetime.savings / amcMovies.length : 0;

    const weeklyFreeUsed = amcMovies.filter((movie) =>
      isSameWeek(new Date(movie.watchDate), new Date(), { weekStartsOn: 1 }),
    ).length;

    const monthlyFreeUsed = amcMovies.filter((movie) =>
      isSameMonth(new Date(movie.watchDate), new Date()),
    ).length;

    const utilizationRate = Math.min(
      100,
      (monthlyFreeUsed / monthlyQuota) * 100,
    );

    const monthsActiveForDelta =
      lifetime.monthsActive > 0 ? lifetime.monthsActive : 0;
    const monthlyValueDelta =
      monthsActiveForDelta > 0
        ? (amcMovies.length / monthsActiveForDelta) *
            settings.aList.avgTicketPrice -
          (settings.aList.isActive ? settings.aList.subscriptionCost : 0)
        : 0;

    let breakEvenMonths: number | null = null;
    if (settings.aList.isActive) {
      if (lifetime.savings >= 0) {
        breakEvenMonths = 0;
      } else if (monthlyValueDelta > 0) {
        breakEvenMonths = Math.ceil(Math.abs(lifetime.savings) / monthlyValueDelta);
      }
    }

    return {
      lifetime,
      monthly,
      yearly,
      avgSavingsPerMovie,
      totalAMCMovies: amcMovies.length,
      monthsActive: lifetime.monthsActive,
      weeklyFreeUsed,
      monthlyFreeUsed,
      utilizationRate,
      breakEvenMonths,
    };
  }, [movies, settings]);

  const effectiveSubscriptionCost = useMemo(
    () => (settings.aList.isActive ? settings.aList.subscriptionCost : 0),
    [settings.aList.isActive, settings.aList.subscriptionCost],
  );

  const ticketsToCover = useMemo(() => {
    if (!settings.aList.isActive) return 0;
    if (settings.aList.avgTicketPrice <= 0) return 0;
    return Math.ceil(effectiveSubscriptionCost / settings.aList.avgTicketPrice);
  }, [effectiveSubscriptionCost, settings.aList.avgTicketPrice, settings.aList.isActive]);

  const startDateDisplay = useMemo(() => {
    if (!settings.aList.startDate) return null;
    const parsed = new Date(settings.aList.startDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [settings.aList.startDate]);

  const letterboxdRssUrl = useMemo(() => {
    const user = normalizeLetterboxdUsername(settings.letterboxd.username);
    return user ? `https://letterboxd.com/${user}/rss/` : "";
  }, [settings.letterboxd.username]);

  const activePeriod =
    viewMode === "lifetime"
      ? stats.lifetime
      : viewMode === "year"
        ? stats.yearly
        : stats.monthly;

  const filteredMovies = useMemo(() => {
    let list = [...movies];
    if (filter === "amc") list = list.filter((movie) => movie.isAMC);
    if (filter === "not") list = list.filter((movie) => !movie.isAMC);

    list.sort((a, b) => {
      if (sortBy === "date") {
        return (
          new Date(b.watchDate).getTime() - new Date(a.watchDate).getTime()
        );
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      const aValue = a.isAMC ? settings.aList.avgTicketPrice : 0;
      const bValue = b.isAMC ? settings.aList.avgTicketPrice : 0;
      return bValue - aValue;
    });

    return list;
  }, [filter, movies, sortBy, settings.aList.avgTicketPrice]);

  const recentActivity = useMemo(
    () =>
      [...movies]
        .filter((movie) => movie.isAMC)
        .sort(
          (a, b) =>
            new Date(b.watchDate).getTime() - new Date(a.watchDate).getTime(),
        )
        .slice(0, 5),
    [movies],
  );

  const handleToggleSelection = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleAMC = (id: string) => {
    setMovies((prev) =>
      prev.map((movie) =>
        movie.id === id ? { ...movie, isAMC: !movie.isAMC } : movie,
      ),
    );
  };

  const handleBulkUpdate = (isAMC: boolean) => {
    if (!selectedIds.size) return;
    setMovies((prev) =>
      prev.map((movie) =>
        selectedIds.has(movie.id) ? { ...movie, isAMC } : movie,
      ),
    );
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (!selectedIds.size) return;
    setMovies((prev) => prev.filter((movie) => !selectedIds.has(movie.id)));
    setSelectedIds(new Set());
  };

  const handleAddMovie = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newMovie.title.trim()) return;
    const ratingValue = newMovie.rating ? Number(newMovie.rating) : undefined;
    setMovies((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        title: newMovie.title.trim(),
        watchDate: newMovie.watchDate,
        isAMC: newMovie.isAMC,
        rating: ratingValue,
        addedManually: true,
      },
    ]);
    setNewMovie({
      title: "",
      watchDate: format(new Date(), "yyyy-MM-dd"),
      isAMC: true,
      rating: "",
    });
  };

  const convertToCsv = (data: Movie[]) => {
    const header = "title,watchDate,isAMC,rating,addedManually";
    const rows = data.map(
      (movie) =>
        `${movie.title.replace(/,/g, " ")},${movie.watchDate},${movie.isAMC},${movie.rating ?? ""},${movie.addedManually}`,
    );
    return [header, ...rows].join("\n");
  };

  const handleExport = (format: "json" | "csv") => {
    const payload = { settings, movies };
    const content =
      format === "json" ? JSON.stringify(payload, null, 2) : convertToCsv(movies);
    const blob = new Blob([content], {
      type: format === "json" ? "application/json" : "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `alist-savings.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearData = () => {
    reset();
    setSelectedIds(new Set());
    setViewMode(initialSettings.preferences.defaultView);
    setSyncStatus(null);
    setSyncError(null);
  };

  const handleLoadDemoData = () => {
    setMovies(() => demoMovies());
    setSettings(() => demoSettings());
    setSelectedIds(new Set());
    setViewMode(demoSettingsTemplate.preferences.defaultView);
    setSyncStatus(null);
    setSyncError(null);
  };

  const handleManualSync = async () => {
    const username = normalizeLetterboxdUsername(settings.letterboxd.username);

    if (!username) {
      setSyncError("Add your Letterboxd username first.");
      return;
    }

    setIsSyncing(true);
    setSyncStatus(null);
    setSyncError(null);

    try {
      const url = new URL("/api/letterboxd", window.location.origin);
      url.searchParams.set("username", username);

      const response = await fetch(url.toString(), { cache: "no-store" });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload) {
        throw new Error(
          payload?.error ?? "Unable to sync Letterboxd right now.",
        );
      }

      const incoming = Array.isArray(payload.movies)
        ? (payload.movies as Movie[])
        : [];
      setMovies((prev) => mergeMoviesWithExisting(incoming, prev));
      setSettings((prev) => ({
        ...prev,
        letterboxd: { ...prev.letterboxd, lastSync: new Date() },
      }));
      setSyncStatus(
        incoming.length
          ? `Synced ${incoming.length} Letterboxd diary entr${incoming.length === 1 ? "y" : "ies"}. Mark AMC trips in Movie Manager.`
          : "No diary entries found to sync yet.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to sync Letterboxd right now.";
      setSyncError(message);
    } finally {
      setIsSyncing(false);
    }
  };

  const scrollToManualAdd = () => {
    const target = document.getElementById("manual-add");
    target?.scrollIntoView({ behavior: "smooth" });
  };

  const shareLabel = (period: Period) =>
    period === "lifetime"
      ? "Lifetime"
      : period === "year"
        ? "Past Year"
        : "This Month";

  const shareTarget = useMemo(
    () =>
      sharePeriod === "lifetime"
        ? stats.lifetime
        : sharePeriod === "year"
          ? stats.yearly
          : stats.monthly,
    [sharePeriod, stats],
  );

  const getShareTone = (savings: number) => {
    if (savings == 0) {
      return {
        headline: "Somehow I broke even... Kind of incredible actually",
        subtitle: "or maybe I didn't add any movies",
        subtitle_font:22
      };
    }
    if (savings < 0) {
      return {
        headline: "YEOUCH! I think I got scammed by A-List",
        subtitle: "Now I really hope I didn't buy too much popcorn",
        subtitle_font:22
      };
    }
    if (savings < 100) {
      return {
        headline: "Not bad! A membership that actually saved me some money",
        subtitle: "",
      };
    }
    return {
      headline: "This is what it feels like to be the AMC A-List GOAT",
      subtitle: "I'M A FUCKING CINEPHILE",
    };
  };

  const shareTone = useMemo(
    () => getShareTone(shareTarget.savings),
    [shareTarget.savings],
  );

  const createShareImage = async () => {
    const canvas = shareCanvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const width = 1080;
    const height = 1300;
    const centerX = width / 2;
    canvas.width = width;
    canvas.height = height;
    // shareTarget.savings
    const tone = getShareTone(shareTarget.savings);

    const palette = {
      desk: "#e7dfd3",
      paper: "#fffdf7",
      paperEdge: "#d9d0c2",
      ink: "#0f100f",
      border: "#171717",
      rule: "#ebe4d8",
      margin: "#e3c9c9",
      accentRed: "#ffe0dc",
      accentBlue: "#dff3f0",
      accentYellow: "#fff4d1",
      accentMint: "#e5f3df",
    };

    const drawWrappedText = (
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      lineHeight: number,
      align: CanvasTextAlign = "center",
    ) => {
      const previousAlign = ctx.textAlign;
      ctx.textAlign = align;
      const words = text.split(" ");
      let line = "";
      let currentY = y;
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        if (ctx.measureText(testLine).width > maxWidth) {
          ctx.fillText(line, x, currentY);
          line = word;
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      if (line) {
        ctx.fillText(line, x, currentY);
        currentY += lineHeight;
      }
      ctx.textAlign = previousAlign;
      return currentY;
    };

    const drawRoundedRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      fill: string,
      strokeWidth = 8,
      strokeColor = palette.border,
    ) => {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (strokeWidth > 0) {
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = strokeColor;
        ctx.stroke();
      }
    };

    ctx.fillStyle = palette.desk;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 280; i += 1) {
      ctx.fillStyle = "rgba(0,0,0,0.04)";
      ctx.fillRect(Math.random() * width, Math.random() * height, 1.1, 1.1);
    }

    const paper = {
      x: 60,
      y: 50,
      w: width - 120,
      h: height - 110,
    };

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 14;
    drawRoundedRect(paper.x, paper.y, paper.w, paper.h, 28, palette.paper, 3, palette.paperEdge);
    ctx.restore();

    // Ruled paper lines
    ctx.strokeStyle = palette.rule;
    ctx.lineWidth = 1.2;
    for (let y = paper.y + 120; y < paper.y + paper.h - 100; y += 90) {
      ctx.beginPath();
      ctx.moveTo(paper.x + 50, y);
      ctx.lineTo(paper.x + paper.w - 50, y);
      ctx.stroke();
    }
    ctx.strokeStyle = palette.margin;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(paper.x + paper.w * 0.16, paper.y + 100);
    ctx.lineTo(paper.x + paper.w * 0.16, paper.y + paper.h - 90);
    ctx.stroke();

    // Torn spiral top
    ctx.fillStyle = palette.desk;
    for (let x = paper.x + 24; x < paper.x + paper.w - 40; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, paper.y + 6);
      ctx.lineTo(x + 22, paper.y - 14);
      ctx.lineTo(x + 44, paper.y + 6);
      ctx.closePath();
      ctx.fill();
    }

    // Spiral holes
    const holeCount = 9;
    const holeSpacing = paper.w / (holeCount + 1);
    for (let i = 1; i <= holeCount; i += 1) {
      const hx = paper.x + holeSpacing * i;
      const hy = paper.y + 28;
      ctx.beginPath();
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.arc(hx + 1.5, hy + 1.5, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = palette.desk;
      ctx.arc(hx, hy, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = palette.paperEdge;
      ctx.lineWidth = 2.4;
      ctx.arc(hx, hy, 12, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = palette.ink;

    const username =
      (settings.letterboxd.username || "").replace(/^@/, "").trim() || "letterboxd";
    const dateLabel = format(new Date(), "MMM d, yyyy");

    let cursorY = paper.y + 150;
    ctx.font = "900 54px 'Space Grotesk', 'Work Sans', sans-serif";
    ctx.fillText("NOTICE OF A-LIST AUDIT", centerX, cursorY);
    cursorY += 42;
    ctx.font = "700 26px 'Work Sans', 'Space Grotesk', sans-serif";
    ctx.fillText(`Date: ${dateLabel}  •  Letterboxd: @${username}`, centerX, cursorY);
    cursorY += 68;

    const blockX = paper.x + 90;
    const blockW = paper.w - 180;

    // Tone block
    drawRoundedRect(blockX, cursorY, blockW, 260, 22, palette.accentBlue, 6, palette.border);
    ctx.fillStyle = palette.ink;
    ctx.font = "900 52px 'Space Grotesk', 'Work Sans', sans-serif";
    drawWrappedText(tone.headline, centerX, cursorY + 94, blockW - 120, 52);
    ctx.font = "700 22px 'Work Sans', 'Space Grotesk', sans-serif";
    drawWrappedText(tone.subtitle, centerX, cursorY + 188, blockW - 140, 38);
    cursorY += 280;

    // Savings sentence
    drawRoundedRect(blockX, cursorY, blockW, 180, 20, palette.accentYellow, 6, palette.border);
    ctx.fillStyle = palette.ink;
    ctx.font = "800 30px 'Work Sans', 'Space Grotesk', sans-serif";
    drawWrappedText(
      `In the ${shareLabel(sharePeriod).toLowerCase()}, using A-List has saved me`,
      centerX,
      cursorY + 64,
      blockW - 140,
      40,
    );
    ctx.font = "900 82px 'Space Grotesk', 'Work Sans', sans-serif";
    ctx.fillText(money.format(shareTarget.savings), centerX, cursorY + 138);
    cursorY += 200;

    // AMC cost vs fee
    drawRoundedRect(blockX, cursorY, blockW, 200, 20, palette.accentMint, 6, palette.border);
    ctx.fillStyle = palette.ink;
    ctx.font = "900 46px 'Space Grotesk', 'Work Sans', sans-serif";
    ctx.fillText(`I went to AMC ${shareTarget.amcCount} times`, centerX, cursorY + 86);
    ctx.font = "700 22px 'Work Sans', 'Space Grotesk', sans-serif";
    const membershipCost = shareTarget.monthsActive * effectiveSubscriptionCost;
    drawWrappedText(
      `which should've cost me ${money.format(shareTarget.ticketValue)} in tickets but the A-List membership actually cost me ${money.format(membershipCost)}`,
      centerX,
      cursorY + 128,
      blockW - 160,
      38,
    );
    cursorY += 230;

    // Last visit
    drawRoundedRect(blockX, cursorY, blockW, 140, 20, palette.accentRed, 6, palette.border);
    ctx.fillStyle = palette.ink;
    ctx.font = "900 42px 'Space Grotesk', 'Work Sans', sans-serif";
    ctx.fillText("The last time I went to AMC", centerX, cursorY + 70);
    ctx.font = "700 22px 'Work Sans', 'Space Grotesk', sans-serif";
    const lastMovieText = latestAMCMovie
      ? `was to watch "${latestAMCMovie.title}" on ${format(new Date(latestAMCMovie.watchDate), "MMM d, yyyy")}`
      : "hasn't been logged yet.";
    drawWrappedText(lastMovieText, centerX, cursorY + 112, blockW - 140, 38);
    cursorY += 200;

    // Perforation + footer
    ctx.save();
    ctx.setLineDash([16, 14]);
    ctx.strokeStyle = palette.paperEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(paper.x + 70, paper.y + paper.h - 70);
    ctx.lineTo(paper.x + paper.w - 70, paper.y + paper.h - 70);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = palette.ink;
    ctx.font = "800 22px 'Work Sans', 'Space Grotesk', sans-serif";
    ctx.fillText(
      "Made using My AMC A-List Audit",
      centerX,
      paper.y + paper.h - 30,
    );

    return canvas.toDataURL("image/png");
  };

  const refreshSharePreview = async () => {
    if (!isShareOpen) return;
    const url = await createShareImage();
    if (url) setSharePreview(url);
  };

  useEffect(() => {
    if (isShareOpen) {
      void refreshSharePreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShareOpen, sharePeriod, stats, settings.preferences.currency]);

  const handleShare = async () => {
    setIsSharing(true);
    setShareStatus(null);
    let blobUrl: string | null = null;
    const scheduleCleanup = () => {
      if (!blobUrl) return;
      const urlToRevoke = blobUrl;
      blobUrl = null;
      setTimeout(() => URL.revokeObjectURL(urlToRevoke), 2000);
    };

    try {
      const dataUrl = await createShareImage();
      if (!dataUrl) {
        setShareStatus("Could not build the share image. Try again.");
        return;
      }
      setSharePreview(dataUrl);
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const filename = `alist-audit-${sharePeriod}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      blobUrl = URL.createObjectURL(blob);

      const shareMessage =
        sharePeriod === "lifetime"
          ? `I've saved ${money.format(shareTarget.savings)} total with AMC A-List.`
          : `I've saved ${money.format(shareTarget.savings)} in the ${shareLabel(sharePeriod).toLowerCase()}.`;
      const shareTitle = "My AMC A-List savings";

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: shareTitle,
          text: `${shareMessage} Track yours with A-List Audit: https://alistauditvercel.vercel.app/`,
        });
        setShareStatus("Shared via your device share sheet.");
        scheduleCleanup();
      } else if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: `${shareMessage} Track yours with A-List Audit: https://alistauditvercel.vercel.app/`,
          url: blobUrl,
        });
        setShareStatus("Shared via your device share sheet.");
        scheduleCleanup();
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = filename;
        link.click();
        setShareStatus("PNG downloaded — ready to drop into socials.");
        scheduleCleanup();
      }
    } catch (error) {
      console.error("Share failed", error);
      setShareStatus("Share failed. Save the PNG and try again.");
    } finally {
      scheduleCleanup();
      setIsSharing(false);
    }
  };

  const openSharePanel = () => {
    setIsShareOpen(true);
    setSharePeriod(viewMode);
    setShareStatus(null);
    setTimeout(() => {
      document.getElementById("share-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 60);
    void refreshSharePreview();
  };

  // const headerBadges = [
  //   // { label: "DID YOU KNOW YOU CAN BREAK EVEN AFTER JUST 2 MOVIES??\nok yeah buddy here's how much you actually ended up spending (or saving?) ", color: "bg-[var(--accent-blue)]" },
  //   // { label: "Firebase Hooks", color: "bg-[var(--accent-yellow)]" },
  //   // { label: "Letterboxd Sync", color: "bg-[var(--accent-salmon)]" },
  // ];

  const viewModes: { value: Period; label: string }[] = [
    { value: "lifetime", label: "Lifetime" },
    { value: "year", label: "Year" },
    { value: "month", label: "Month" },
  ];

  const tabs = [
    { id: "dashboard" as const, label: "Dashboard", icon: Gauge },
    { id: "movies" as const, label: "Movie Manager", icon: Clapperboard },
    { id: "settings" as const, label: "Settings", icon: Settings2 },
  ];

  return (
    <div className="dot-grid min-h-screen overflow-x-hidden bg-[var(--background)] px-4 py-8 text-black md:px-8 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="relative overflow-hidden rounded-2xl border-4 border-black bg-white p-6 shadow-[8px_8px_0_#000] md:p-8">
          <div className="absolute -left-8 -top-8 h-32 w-32 rotate-3 bg-[var(--accent-yellow)]" />
          <div className="absolute -right-10 -bottom-10 h-40 w-40 -rotate-2 bg-[var(--accent-blue)]" />
          <div className="relative flex flex-col items-center gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-wrap items-end justify-center gap-3">
                <h1
                  className="text-4xl font-black uppercase leading-tight tracking-[0.08em] sm:text-5xl"
                  style={{ fontFamily: "var(--font-space-grotesk)" }}
                >
                  <span className="relative inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border-[6px] border-black bg-white px-5 py-3 shadow-[10px_10px_0_#000]">
                    <span className="text-4xl font-black leading-tight sm:text-5xl">
                      My AMC A-List
                    </span>
                    <span className="brutal-shake inline-block rounded-xl border-[5px] border-black bg-[var(--accent-yellow)] px-4 py-2 text-4xl font-black leading-none shadow-[6px_6px_0_#000] sm:text-6xl">
                      Audit
                    </span>
                  </span>
                </h1>
                
                {/* <div className="flex items-center gap-2 rounded-full border-[3px] border-black bg-black px-3 py-1 text-white">
                  <Sparkles size={16} />
                  <span className="text-sm font-bold">Neubrutalist</span>
                </div> */}
              </div>
              {/* <p className="max-w-3xl text-base font-medium leading-relaxed text-black/80">
                DID YOU KNOW YOU CAN BREAK EVEN AFTER JUST 2 MOVIES?? ok yeah buddy here's how much you actually ended up spending (or saving?) 
              </p> */}
            </div>
            {/* <div className="flex flex-wrap gap-3">
              {headerBadges.map((badge) => (
                <span
                  key={badge.label}
                  className={`brutal-card ${badge.color} px-3 py-2 text-xs font-black uppercase tracking-wide`}
                >
                  {badge.label}
                </span>
              ))}
            </div> */}
            <div className="flex flex-wrap items-center gap-3">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`brutal-button flex items-center gap-2 px-4 py-3 ${isActive ? "bg-[var(--accent-red)]" : "bg-white"}`}
                  >
                    <Icon size={18} />
                    <span className="text-sm font-extrabold uppercase">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={openSharePanel}
                className="brutal-button bg-[var(--accent-yellow)] px-4 py-3 sm:ml-auto"
              >
                {/* <Share2 size={12} /> */}
                <span className="text-sm font-extrabold uppercase">
                  Share my savings!!
                </span>
              </button>
              {/* <div className="ml-auto flex items-center gap-2 rounded-full border-[3px] border-black bg-[var(--accent-yellow)] px-3 py-2 text-xs font-bold uppercase tracking-wide">
                <Check size={14} />
                Offline-ready cache preview
              </div> */}
            </div>
          </div>
        </div>

        {isShareOpen && (
          <div
            id="share-panel"
            className="brutal-card accent-mint relative overflow-hidden p-6 sm:p-8"
          >
            <div className="absolute -left-8 top-4 h-24 w-24 -rotate-6 bg-[var(--accent-yellow)]" />
            <div className="absolute -right-10 bottom-4 h-28 w-28 rotate-6 bg-[var(--accent-red)]" />
            <div className="relative grid grid-cols-1 gap-6 md:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em]">
                      Share-ready
                    </p>
                    <h3 className="text-2xl font-black">Audit Receipt</h3>
                  </div>
                  <button
                    onClick={() => setIsShareOpen(false)}
                    className="brutal-button bg-white px-3 py-2 text-xs"
                  >
                    Close
                  </button>
                </div>
                <p className="max-w-2xl text-sm font-semibold text-black/80">
                  Generate a receipt image with your {shareLabel(sharePeriod).toLowerCase()} savings along with other statistics.
                </p>
                <div className="rounded-xl border-[3px] border-black bg-white px-4 py-3">
                  <p className="text-lg font-black leading-tight">{shareTone.headline}</p>
                  <p className="text-sm font-semibold text-black/70">{shareTone.subtitle}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {viewModes.map((mode) => (
                    <button
                      key={`share-${mode.value}`}
                      onClick={() => {
                        setSharePeriod(mode.value);
                        setShareStatus(null);
                      }}
                      className={`brutal-button px-3 py-2 text-xs ${sharePeriod === mode.value ? "bg-black text-white" : "bg-white"}`}
                    >
                      {mode.label}
                    </button>
                  ))}
                  <span className="rounded-full border-[3px] border-black bg-white px-3 py-1 text-xs font-bold uppercase">
                    {money.format(shareTarget.savings)} net savings
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border-[3px] border-black bg-white px-4 py-3">
                    <p className="text-xs font-bold uppercase">
                      {shareLabel(sharePeriod)} saved
                    </p>
                    <p className="text-2xl font-black">{money.format(shareTarget.savings)}</p>
                    <p className="text-sm font-semibold text-black/70">
                      {shareTarget.amcCount} AMC trips
                    </p>
                  </div>
                  <div className="rounded-xl border-[3px] border-black bg-white px-4 py-3">
                    <p className="text-xs font-bold uppercase">Avg per movie</p>
                    <p className="text-2xl font-black">
                      {money.format(stats.avgSavingsPerMovie || 0)}
                    </p>
                    <p className="text-sm font-semibold text-black/70">
                      {stats.totalAMCMovies} AMC movies total
                    </p>
                  </div>
                  <div className="rounded-xl border-[3px] border-black bg-white px-4 py-3">
                    <p className="text-xs font-bold uppercase">Utilization</p>
                    <p className="text-2xl font-black">{stats.utilizationRate.toFixed(0)}%</p>
                    <p className="text-sm font-semibold text-black/70">
                      {stats.weeklyFreeUsed}/{weeklyQuota} this week
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="brutal-button bg-black px-4 py-3 text-white"
                  >
                    {isSharing ? "Sharing..." : "Share / Save PNG"}
                  </button>
                  <button
                    onClick={refreshSharePreview}
                    disabled={isSharing}
                    className="brutal-button bg-white px-4 py-3"
                  >
                    Refresh preview
                  </button>
                  {/* <span className="text-xs font-bold uppercase">
                    1080×1920 • Neubrutalist textures
                  </span> */}
                </div>
                <div className="rounded-xl border-[3px] border-black bg-white px-4 py-3 text-sm font-semibold">
                  {shareStatus ?? "Hold image to share receipts to apps, if it isn't too embarassing for you."}
                </div>
              </div>
              <div className="flex justify-center md:justify-end">
                <div className="w-full max-w-[420px] bg-white p-3" style={{
                  background:"transparent"
                }}>
                  {sharePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sharePreview}
                      alt="Share preview"
                      className="h-auto w-full rounded-lg border-[4px] border-black shadow-[8px_8px_0_#000]"
                    />
                  ) : (
                    <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border-[3px] border-dashed border-black bg-white/60 p-4 text-center text-sm font-semibold">
                      Tap share to build a brutalist PNG with your stats.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="brutal-card p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">
                    Letterboxd Connection
                  </p>
                  <h3 className="text-2xl font-black">Sync Inputs</h3>
                </div>
                <Link2 size={24} className="stroke-[3px]" />
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs">Username</label>
                  <input
                    value={settings.letterboxd.username}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        letterboxd: {
                          ...prev.letterboxd,
                          username: event.target.value,
                        },
                      }))
                    }
                  />
                  <p className="mt-1 text-xs font-semibold text-black/60">
                    RSS auto: {letterboxdRssUrl || "https://letterboxd.com/yourname/rss/"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-[3px] border-black bg-[var(--accent-blue)] px-4 py-3">
                  <div>
                    <p className="text-xs font-bold uppercase">Status</p>
                    <p className="text-sm font-black">
                      {settings.letterboxd.lastSync
                        ? `Last synced ${format(settings.letterboxd.lastSync, "MMM d, h:mm a")}`
                        : "Not synced yet"}
                    </p>
                  </div>
                  <button
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="brutal-button bg-black px-3 py-2 text-white"
                  >
                    {isSyncing ? "Syncing..." : "Manual Sync"}
                  </button>
                </div>
                {(syncStatus || syncError) && (
                  <div
                    className={`rounded-lg border-[3px] px-3 py-2 text-xs font-bold uppercase ${syncError ? "bg-[var(--accent-red)]" : "bg-[var(--accent-mint)]"}`}
                  >
                    {syncError ?? syncStatus}
                  </div>
                )}
              </div>
            </div>

            <div className="brutal-card p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">
                    A-List Information
                  </p>
                  <h3 className="text-2xl font-black">Plan Details</h3>
                </div>
                <Ticket size={24} className="stroke-[3px]" />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs">Monthly fee</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.aList.subscriptionCost}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        aList: {
                          ...prev.aList,
                          subscriptionCost: Number(event.target.value),
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs">Avg ticket price</label>
                  <input
                    type="number"
                    step="0.5"
                    value={settings.aList.avgTicketPrice}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        aList: {
                          ...prev.aList,
                          avgTicketPrice: Number(event.target.value),
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs">Start date</label>
                  <input
                    type="date"
                    value={settings.aList.startDate}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        aList: { ...prev.aList, startDate: event.target.value },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={settings.aList.isActive}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        aList: { ...prev.aList, isActive: event.target.checked },
                      }))
                    }
                    className="h-5 w-5 accent-black"
                  />
                  <span className="text-sm font-bold uppercase">
                    Membership active (bill subscription)
                  </span>
                </div>
                <div className="flex flex-col justify-end">
                  <label className="text-xs">Months active</label>
                  <div className="rounded-xl border-[3px] border-black bg-[var(--accent-yellow)] px-4 py-3 text-lg font-black">
                    {stats.monthsActive}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <canvas ref={shareCanvasRef} className="hidden" aria-hidden />

        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="brutal-card accent-red relative overflow-hidden p-6 sm:p-8 lg:col-span-2">
              <div className="absolute right-10 top-6 -rotate-6 rounded-full bg-black px-3 py-1 text-xs font-black uppercase text-white">
                {viewMode}
              </div>
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex gap-2">
                    {viewModes.map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => setViewMode(mode.value)}
                        className={`brutal-button px-3 py-2 text-xs ${viewMode === mode.value ? "bg-black text-white" : "bg-white"}`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                  <span className="rounded-full border-[3px] border-black bg-white px-3 py-1 text-xs font-bold uppercase">
                    {settings.aList.isActive
                      ? `Months Active: ${stats.monthsActive}`
                      : "A-List inactive"}
                  </span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em]">
                      Total Savings
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-5xl font-black leading-none sm:text-6xl"
                        style={{ fontFamily: "var(--font-space-grotesk)" }}
                      >
                        {money.format(activePeriod.savings)}
                      </span>
                      <ArrowUpRight size={28} />
                    </div>
                    <p className="text-sm font-semibold text-black/70">
                      Savings = AMC Movies × Avg Ticket - Months × Fee
                    </p>
                    {!settings.aList.isActive && (
                      <p className="text-xs font-bold uppercase text-black/60">
                        Turn on Membership active in Settings to calculate savings.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <div className="rounded-xl border-[3px] border-black bg-white px-4 py-3 text-center">
                      <p className="text-xs font-bold uppercase">AMC Movies</p>
                      <p className="text-2xl font-black">{activePeriod.amcCount}</p>
                    </div>
                    <div className="rounded-xl border-[3px] border-black bg-white px-4 py-3 text-center">
                      <p className="text-xs font-bold uppercase">Avg / Movie</p>
                      <p className="text-2xl font-black">
                        {money.format(stats.avgSavingsPerMovie || 0)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border-[3px] border-black bg-white px-4 py-3">
                    <p className="text-xs font-bold uppercase">Monthly Savings</p>
                    <p className="text-2xl font-black">
                      {money.format(stats.monthly.savings)}
                    </p>
                    <p className="text-sm font-semibold text-black/70">
                      Month: {stats.monthly.amcCount} AMC trips
                    </p>
                  </div>
                  <div className="rounded-xl border-[3px] border-black bg-white px-4 py-3">
                    <p className="text-xs font-bold uppercase">Yearly Savings</p>
                    <p className="text-2xl font-black">
                      {money.format(stats.yearly.savings)}
                    </p>
                    <p className="text-sm font-semibold text-black/70">
                      Year: {stats.yearly.amcCount} AMC trips
                    </p>
                  </div>
                  <div className="rounded-xl border-[3px] border-black bg-white px-4 py-3">
                    <p className="text-xs font-bold uppercase">Ticket Value</p>
                    <p className="text-2xl font-black">
                      {money.format(stats.lifetime.ticketValue)}
                    </p>
                    <p className="text-sm font-semibold text-black/70">
                      Fee burn: {money.format(stats.monthsActive * effectiveSubscriptionCost)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="brutal-card accent-blue flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">
                    Free Movies Tracker
                  </p>
                  <h3 className="text-2xl font-black">Weekly Pace</h3>
                </div>
                <Ticket size={28} className="stroke-[3px]" />
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm font-bold uppercase">
                    <span>This Week</span>
                    <span>
                      {stats.weeklyFreeUsed}/{weeklyQuota}
                    </span>
                  </div>
                  <ProgressBar
                    value={stats.weeklyFreeUsed}
                    max={weeklyQuota}
                    color="bg-black"
                  />
                  {stats.weeklyFreeUsed < weeklyQuota ? (
                    <p className="mt-2 text-sm font-semibold">
                      {weeklyQuota - stats.weeklyFreeUsed} left to max perks this
                      week.
                    </p>
                  ) : (
                    <p className="mt-2 text-sm font-semibold">
                      Nailed it. Free quota exhausted!
                    </p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm font-bold uppercase">
                    <span>Month Utilization</span>
                    <span>{stats.monthlyFreeUsed}/{monthlyQuota}</span>
                  </div>
                  <ProgressBar
                    value={stats.monthlyFreeUsed}
                    max={monthlyQuota}
                    color="bg-[#111]"
                  />
                  <p className="mt-2 text-sm font-semibold">
                    Utilization: {stats.utilizationRate.toFixed(0)}%
                  </p>
                </div>
              </div>
              <div className="rounded-xl border-[3px] border-black bg-white px-4 py-3">
                <p className="text-xs font-bold uppercase">Break-even Pace</p>
                <p className="text-lg font-black">
                  {stats.breakEvenMonths === null
                    ? "Needs more AMC visits"
                    : stats.breakEvenMonths === 0
                      ? "Already profitable"
                      : `${stats.breakEvenMonths} month${stats.breakEvenMonths > 1 ? "s" : ""} at current pace`}
                </p>
                <p className="text-sm font-semibold text-black/70">
                  {settings.aList.isActive && ticketsToCover > 0
                    ? `Needs about ${ticketsToCover} AMC movies monthly to cover subscription.`
                    : "Set your plan + avg ticket price to see the break-even target."}
                </p>
              </div>
            </div>

            <div className="brutal-card accent-yellow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">
                    A-List Snapshot
                  </p>
                  <h3 className="text-2xl font-black">Cost vs Value</h3>
                </div>
                <BarChart3 size={26} className="stroke-[3px]" />
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between rounded-xl border-[3px] border-black bg-white px-4 py-3">
                  <span className="text-sm font-bold uppercase">
                    Membership
                  </span>
                  <span className="text-lg font-black">
                    {settings.aList.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex justify-between rounded-xl border-[3px] border-black bg-white px-4 py-3">
                  <span className="text-sm font-bold uppercase">
                    Monthly Fee
                  </span>
                  <span className="text-lg font-black">
                    {money.format(settings.aList.subscriptionCost)}
                  </span>
                </div>
                <div className="flex justify-between rounded-xl border-[3px] border-black bg-white px-4 py-3">
                  <span className="text-sm font-bold uppercase">
                    Avg Ticket
                  </span>
                  <span className="text-lg font-black">
                    {money.format(settings.aList.avgTicketPrice)}
                  </span>
                </div>
                <div className="flex justify-between rounded-xl border-[3px] border-black bg-white px-4 py-3">
                  <span className="text-sm font-bold uppercase">
                    Total AMC Trips
                  </span>
                  <span className="text-lg font-black">
                    {stats.totalAMCMovies}
                  </span>
                </div>
              </div>
            </div>

            <div className="brutal-card p-6 sm:p-8 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">
                    Quick Stats
                  </p>
                  <h3 className="text-2xl font-black">Savings Grid</h3>
                </div>
                <Gauge size={26} className="stroke-[3px]" />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border-[3px] border-black bg-[var(--accent-blue)] px-4 py-3">
                  <p className="text-xs font-bold uppercase">Avg / Month</p>
                  <p className="text-2xl font-black">
                    {stats.monthsActive > 0
                      ? money.format(
                          stats.lifetime.savings / stats.monthsActive || 0,
                        )
                      : "$0"}
                  </p>
                  <p className="text-sm font-semibold text-black/80">
                    Rolling average savings
                  </p>
                </div>
                <div className="rounded-xl border-[3px] border-black bg-[var(--accent-salmon)] px-4 py-3">
                  <p className="text-xs font-bold uppercase">Avg / Movie</p>
                  <p className="text-2xl font-black">
                    {money.format(stats.avgSavingsPerMovie || 0)}
                  </p>
                  <p className="text-sm font-semibold text-black/80">
                    Based on AMC-marked titles
                  </p>
                </div>
                <div className="rounded-xl border-[3px] border-black bg-[var(--accent-mint)] px-4 py-3">
                  <p className="text-xs font-bold uppercase">Active Months</p>
                  <p className="text-2xl font-black">{stats.monthsActive}</p>
                  <p className="text-sm font-semibold text-black/80">
                    {startDateDisplay
                      ? `Since ${format(startDateDisplay, "MMM yyyy")}`
                      : "Set your start date"}
                  </p>
                </div>
              </div>
            </div>

            <div className="brutal-card p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">
                    Recent AMC Watchlist
                  </p>
                  <h3 className="text-2xl font-black">Last 5 AMC movies</h3>
                </div>
                <ListChecks size={26} className="stroke-[3px]" />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {recentActivity.map((movie) => (
                  <div
                    key={movie.id}
                    className="rounded-xl border-[3px] border-black bg-white px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-black bg-[var(--accent-yellow)]">
                          <Clapperboard size={20} className="stroke-[3px]" />
                        </div>
                        <div>
                          <p className="text-sm font-black">{movie.title}</p>
                          <p className="text-xs font-semibold text-black/70">
                            {format(new Date(movie.watchDate), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full border-2 border-black bg-[var(--accent-blue)] px-3 py-1 text-xs font-bold uppercase">
                        +{money.format(settings.aList.avgTicketPrice)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {activeTab === "movies" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="brutal-card p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em]">
                      Movie Manager
                    </p>
                    <h3 className="text-2xl font-black">Mark AMC watches</h3>
                  </div>
                  <button
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="brutal-button flex items-center gap-2 bg-[var(--accent-blue)] px-4 py-2"
                  >
                    <RefreshCcw size={16} />
                    Pull Letterboxd
                  </button>
                </div>
                {(syncStatus || syncError) && (
                  <div
                    className={`mt-3 rounded-lg border-[3px] px-3 py-2 text-xs font-bold uppercase ${syncError ? "bg-[var(--accent-red)]" : "bg-[var(--accent-mint)]"}`}
                  >
                    {syncError ?? syncStatus}
                  </div>
                )}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border-[3px] border-black bg-[var(--accent-yellow)] px-4 py-3">
                    <p className="text-xs font-bold uppercase">Total Movies</p>
                    <p className="text-2xl font-black">{movies.length}</p>
                  </div>
                  <div className="rounded-xl border-[3px] border-black bg-[var(--accent-blue)] px-4 py-3">
                    <p className="text-xs font-bold uppercase">AMC</p>
                    <p className="text-2xl font-black">{stats.totalAMCMovies}</p>
                  </div>
                  <div className="rounded-xl border-[3px] border-black bg-[var(--accent-salmon)] px-4 py-3">
                    <p className="text-xs font-bold uppercase">Avg $ / Movie</p>
                    <p className="text-2xl font-black">
                      {money.format(stats.avgSavingsPerMovie || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="brutal-card p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      className={`brutal-button px-3 py-2 text-xs ${filter === "all" ? "bg-black text-white" : "bg-white"}`}
                      onClick={() => setFilter("all")}
                    >
                      All
                    </button>
                    <button
                      className={`brutal-button px-3 py-2 text-xs ${filter === "amc" ? "bg-black text-white" : "bg-white"}`}
                      onClick={() => setFilter("amc")}
                    >
                      AMC Only
                    </button>
                    <button
                      className={`brutal-button px-3 py-2 text-xs ${filter === "not" ? "bg-black text-white" : "bg-white"}`}
                      onClick={() => setFilter("not")}
                    >
                      Not AMC
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase">Sort</span>
                    <select
                      value={sortBy}
                      onChange={(event) =>
                        setSortBy(event.target.value as typeof sortBy)
                      }
                      className="w-auto bg-white text-sm font-bold"
                    >
                      <option value="date">Date</option>
                      <option value="title">Title</option>
                      <option value="savings">Savings</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleBulkUpdate(true)}
                    className="brutal-button bg-[var(--accent-blue)] px-3 py-2 text-xs"
                  >
                    Mark Selected AMC
                  </button>
                  <button
                    onClick={() => handleBulkUpdate(false)}
                    className="brutal-button bg-white px-3 py-2 text-xs"
                  >
                    Clear AMC
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="brutal-button bg-[var(--accent-red)] px-3 py-2 text-xs"
                  >
                    Delete Selected
                  </button>
                  <span className="text-xs font-bold uppercase">
                    Selected: {selectedIds.size}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {filteredMovies.map((movie) => (
                  <div
                    key={movie.id}
                    className="brutal-card flex flex-col gap-3 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(movie.id)}
                        onChange={() => handleToggleSelection(movie.id)}
                        className="h-4 w-4 shrink-0 accent-black sm:h-5 sm:w-5"
                      />
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border-[3px] border-black bg-[var(--accent-yellow)]">
                        <Clapperboard size={20} className="stroke-[3px]" />
                      </div>
                      <div>
                        <p className="text-lg font-black">{movie.title}</p>
                        <p className="text-xs font-semibold text-black/70">
                          {format(new Date(movie.watchDate), "MMM d, yyyy")}
                          {movie.addedManually && " • Manual"}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold uppercase">
                          <span
                            className={`rounded-full border-2 border-black px-2 py-1 ${movie.isAMC ? "bg-[var(--accent-blue)]" : "bg-white"}`}
                          >
                            {movie.isAMC ? "AMC" : "Not AMC"}
                          </span>
                          {movie.rating && (
                            <span className="rounded-full border-2 border-black bg-[var(--accent-mint)] px-2 py-1">
                              {movie.rating} ★
                            </span>
                          )}
                          {movie.notes && (
                            <span className="rounded-full border-2 border-black bg-[var(--accent-salmon)] px-2 py-1">
                              {movie.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold uppercase">Savings</p>
                        <p className="text-xl font-black">
                          {movie.isAMC
                            ? money.format(settings.aList.avgTicketPrice)
                            : "$0"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleAMC(movie.id)}
                        className={`brutal-button px-3 py-2 text-xs ${movie.isAMC ? "bg-[var(--accent-blue)]" : "bg-white"}`}
                      >
                        Used A-List
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="brutal-card p-6" id="manual-add">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em]">
                      Manual Movie
                    </p>
                    <h3 className="text-xl font-black">Add entry</h3>
                  </div>
                  <Plus size={22} className="stroke-[3px]" />
                </div>
                <form className="mt-4 space-y-3" onSubmit={handleAddMovie}>
                  <div>
                    <label className="text-xs">Title</label>
                    <input
                      required
                      value={newMovie.title}
                      onChange={(event) =>
                        setNewMovie((prev) => ({
                          ...prev,
                          title: event.target.value,
                        }))
                      }
                      placeholder="Movie title"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs">Watch date</label>
                      <input
                        type="date"
                        required
                        value={newMovie.watchDate}
                        onChange={(event) =>
                          setNewMovie((prev) => ({
                            ...prev,
                            watchDate: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs">Rating (optional)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={newMovie.rating}
                        onChange={(event) =>
                          setNewMovie((prev) => ({
                            ...prev,
                            rating: event.target.value,
                          }))
                        }
                        placeholder="4.5"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newMovie.isAMC}
                      onChange={(event) =>
                        setNewMovie((prev) => ({
                          ...prev,
                          isAMC: event.target.checked,
                        }))
                      }
                      className="h-5 w-5 accent-black"
                    />
                    <span className="text-sm font-bold uppercase">
                      Count as AMC
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="brutal-button w-full bg-[var(--accent-yellow)] px-4 py-3"
                  >
                    Add Movie
                  </button>
                </form>
              </div>

              <div className="brutal-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em]">
                      Data Controls
                    </p>
                    <h3 className="text-xl font-black">Export / Reset</h3>
                  </div>
                  <Download size={22} className="stroke-[3px]" />
                </div>
                <div className="mt-4 space-y-3">
                  <button
                    onClick={() => handleExport("json")}
                    className="brutal-button w-full bg-white px-4 py-3"
                  >
                    Export JSON
                  </button>
                  <button
                    onClick={() => handleExport("csv")}
                    className="brutal-button w-full bg-white px-4 py-3"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={handleClearData}
                    className="brutal-button w-full bg-[var(--accent-red)] px-4 py-3"
                  >
                    Clear Data
                  </button>
                  <button
                    onClick={handleLoadDemoData}
                    className="brutal-button w-full bg-[var(--accent-blue)] px-4 py-3"
                  >
                    Load Demo Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="brutal-card p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">
                    Letterboxd Connection
                  </p>
                  <h3 className="text-2xl font-black">Sync Inputs</h3>
                </div>
                <Link2 size={24} className="stroke-[3px]" />
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs">Username</label>
                  <input
                    value={settings.letterboxd.username}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        letterboxd: {
                          ...prev.letterboxd,
                          username: event.target.value,
                        },
                      }))
                    }
                  />
                  <p className="mt-1 text-xs font-semibold text-black/60">
                    RSS auto: {letterboxdRssUrl || "https://letterboxd.com/yourname/rss/"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-[3px] border-black bg-[var(--accent-blue)] px-4 py-3">
                  <div>
                    <p className="text-xs font-bold uppercase">Status</p>
                    <p className="text-sm font-black">
                      {settings.letterboxd.lastSync
                        ? `Last synced ${format(settings.letterboxd.lastSync, "MMM d, h:mm a")}`
                        : "Not synced yet"}
                    </p>
                  </div>
                  <button
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="brutal-button bg-black px-3 py-2 text-white"
                  >
                    {isSyncing ? "Syncing..." : "Manual Sync"}
                  </button>
                </div>
                {(syncStatus || syncError) && (
                  <div
                    className={`rounded-lg border-[3px] px-3 py-2 text-xs font-bold uppercase ${syncError ? "bg-[var(--accent-red)]" : "bg-[var(--accent-mint)]"}`}
                  >
                    {syncError ?? syncStatus}
                  </div>
                )}
              </div>
            </div>

            <div className="brutal-card p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">
                    A-List Information
                  </p>
                  <h3 className="text-2xl font-black">Plan Details</h3>
                </div>
                <Ticket size={24} className="stroke-[3px]" />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs">Monthly fee</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.aList.subscriptionCost}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        aList: {
                          ...prev.aList,
                          subscriptionCost: Number(event.target.value),
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs">Avg ticket price</label>
                  <input
                    type="number"
                    step="0.5"
                    value={settings.aList.avgTicketPrice}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        aList: {
                          ...prev.aList,
                          avgTicketPrice: Number(event.target.value),
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs">Start date</label>
                  <input
                    type="date"
                    value={settings.aList.startDate}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        aList: { ...prev.aList, startDate: event.target.value },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={settings.aList.isActive}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        aList: { ...prev.aList, isActive: event.target.checked },
                      }))
                    }
                    className="h-5 w-5 accent-black"
                  />
                  <span className="text-sm font-bold uppercase">
                    Membership active (bill subscription)
                  </span>
                </div>
                <div className="flex flex-col justify-end">
                  <label className="text-xs">Months active</label>
                  <div className="rounded-xl border-[3px] border-black bg-[var(--accent-yellow)] px-4 py-3 text-lg font-black">
                    {stats.monthsActive}
                  </div>
                </div>
              </div>
            </div>

            <div className="brutal-card p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">
                    Display Preferences
                  </p>
                  <h3 className="text-2xl font-black">Defaults</h3>
                </div>
                <Settings2 size={24} className="stroke-[3px]" />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs">Default view</label>
                  <select
                    value={settings.preferences.defaultView}
                    onChange={(event) => {
                      const next = event.target.value as Period;
                      setSettings((prev) => ({
                        ...prev,
                        preferences: { ...prev.preferences, defaultView: next },
                      }));
                      setViewMode(next);
                    }}
                    className="bg-white text-sm font-bold"
                  >
                    <option value="lifetime">Lifetime</option>
                    <option value="year">Year</option>
                    <option value="month">Month</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs">Currency</label>
                  <select
                    value={settings.preferences.currency}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          currency: event.target.value as "USD",
                        },
                      }))
                    }
                    className="bg-white text-sm font-bold"
                  >
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.preferences.notifications}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          notifications: event.target.checked,
                        },
                      }))
                    }
                    className="h-5 w-5 accent-black"
                  />
                  <span className="text-sm font-bold uppercase">
                    Weekly reminders
                  </span>
                </div>
              </div>
            </div>

            <div className="brutal-card p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">
                    Data Management
                  </p>
                  <h3 className="text-2xl font-black">Export & Reset</h3>
                </div>
                <Trash2 size={24} className="stroke-[3px]" />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={() => handleExport("json")}
                  className="brutal-button bg-white px-4 py-3"
                >
                  Export JSON
                </button>
                <button
                  onClick={() => handleExport("csv")}
                  className="brutal-button bg-white px-4 py-3"
                >
                  Export CSV
                </button>
                <button
                  onClick={handleClearData}
                  className="brutal-button bg-[var(--accent-red)] px-4 py-3"
                >
                  Clear All Data
                </button>
                <button
                  onClick={handleLoadDemoData}
                  className="brutal-button bg-[var(--accent-blue)] px-4 py-3"
                >
                  Load Demo State
                </button>
              </div>
            </div>

            <div className="brutal-card p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">
                    About
                  </p>
                  <h3 className="text-2xl font-black">App Info</h3>
                </div>
                <Wand2 size={24} className="stroke-[3px]" />
              </div>
              <div className="mt-4 space-y-2 text-sm font-semibold">
                <p>Version: 0.2.0 (web demo)</p>
                <p>Designed by Aditeya Shukla</p>
                <p>Just for funsies</p>
                
              </div>
            </div>
          </div>
        )}

        {activeTab === "movies" && (
          <button
            onClick={scrollToManualAdd}
            className="fixed bottom-20 right-6 z-20 brutal-button flex items-center gap-2 bg-black px-4 py-3 text-white shadow-[6px_6px_0_#000]"
          >
            <Plus size={18} />
            Add Movie
          </button>
        )}

        {/* <div className="fixed inset-x-4 bottom-4 z-10 mx-auto max-w-xl">
          <div className="brutal-card bg-white px-3 py-2">
            <div className="grid grid-cols-3 gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={`bottom-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`brutal-button flex items-center justify-center gap-1 px-3 py-2 text-[11px] ${isActive ? "bg-[var(--accent-yellow)]" : "bg-white"}`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
}
