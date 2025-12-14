import { NextRequest, NextResponse } from "next/server";

type ParsedMovie = {
  id: string;
  title: string;
  watchDate: string;
  letterboxdId?: string;
  rating?: number;
  isAMC: boolean;
  addedManually: boolean;
};

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

const extractTagValue = (block: string, tag: string) => {
  const match = block.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );
  if (!match) return null;
  return decodeHtmlEntities(match[1]);
};

const toDateOnly = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const parseLetterboxdRss = (xml: string): ParsedMovie[] => {
  const items = Array.from(
    xml.matchAll(new RegExp("<item>([\\s\\S]*?)</item>", "g")),
  );
  const results: ParsedMovie[] = [];

  for (const [, item] of items) {
    const title =
      extractTagValue(item, "letterboxd:filmTitle") ??
      extractTagValue(item, "title");
    const watchedRaw =
      extractTagValue(item, "letterboxd:watchedDate") ??
      extractTagValue(item, "pubDate");
    const watchDate = toDateOnly(watchedRaw);
    if (!title || !watchDate) continue;

    const link = extractTagValue(item, "link") ?? extractTagValue(item, "guid");
    const slugMatch = link?.match(/letterboxd\.com\/[^/]+\/film\/([^/]+)/i);
    const letterboxdId = slugMatch?.[1];

    const ratingRaw = extractTagValue(item, "letterboxd:memberRating");
    const rating = ratingRaw ? Number.parseFloat(ratingRaw) : undefined;

    const idBase =
      letterboxdId ??
      title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    results.push({
      id: `${idBase}-${watchDate}`,
      title,
      watchDate,
      letterboxdId,
      rating: Number.isFinite(rating) ? rating : undefined,
      isAMC: false,
      addedManually: false,
    });
  }

  return results;
};

const buildFeedUrl = (username?: string | null) => {
  const trimmedUser = username?.replace(/^@/, "").trim();
  if (trimmedUser) return `https://letterboxd.com/${trimmedUser}/rss/`;
  return null;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const feedUrl = buildFeedUrl(searchParams.get("username"));

  if (!feedUrl) {
    return NextResponse.json(
      { error: "Add your Letterboxd username to sync." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(feedUrl, {
      cache: "no-store",
      headers: { Accept: "application/rss+xml, application/xml" },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Letterboxd responded with ${response.status}. Check the username or RSS URL.`,
        },
        { status: response.status },
      );
    }

    const xml = await response.text();
    const movies = parseLetterboxdRss(xml);

    return NextResponse.json({ movies, source: feedUrl });
  } catch (error) {
    console.error("Letterboxd sync failed", error);
    return NextResponse.json(
      { error: "Unable to reach Letterboxd right now." },
      { status: 500 },
    );
  }
}
