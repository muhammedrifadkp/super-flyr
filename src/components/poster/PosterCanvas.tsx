"use client";

import type Konva from "konva";
import { useEffect, useMemo, useState, type ReactNode, type Ref } from "react";
import { Circle, Ellipse, Group, Image as KonvaImage, Layer, Line, Path, Rect, Shape, Stage, Star, Text } from "react-konva";
import { getLoadedImage, useImages } from "@/lib/client/imageCache";
import { discountPercent, formatPrice, formatValidity } from "@/lib/format";
import { fontFamily, fontWeight, loadPosterFonts, stack } from "@/lib/poster/fonts";
import { cellsFor, contactText, pageItems, posterGeometry, seededRandom, type Box, type PosterGeometry } from "@/lib/poster/layout";
import { isTransparent, mix, normalizeContent, normalizeLayout, normalizeStyle, readableOn } from "@/lib/poster/templates";
import type { FontKey, Poster, PosterContent, PosterStyle, ResolvedItem, Store } from "@/lib/types";

export interface PosterCanvasProps {
  poster: Pick<Poster, "id" | "layout" | "style" | "content">;
  store: Store;
  items: ResolvedItem[];
  page: number;
  /** On-screen width in CSS pixels. Use the format width (scale 1) for export. */
  displayWidth: number;
  selectedId?: string | null;
  onSelectItem?: (id: string) => void;
  stageRef?: Ref<Konva.Stage>;
  showEmptyHint?: boolean;
  /** Called after fonts and images are loaded and drawn. */
  onReady?: () => void;
}

const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

// ---------- text helpers ----------

let measureContext: CanvasRenderingContext2D | null = null;
function measure(text: string, size: number, family: string, weight: string): number {
  if (!text) return 0;
  if (!measureContext) measureContext = document.createElement("canvas").getContext("2d");
  if (!measureContext) return text.length * size * 0.5;
  measureContext.font = `${weight} ${size}px ${family}`;
  return measureContext.measureText(text).width;
}

function fit(text: string, family: string, weight: string, maxWidth: number, maxSize: number, minSize: number): number {
  if (!text) return maxSize;
  const width = measure(text, maxSize, family, weight);
  return width <= maxWidth ? maxSize : Math.max(minSize, (maxSize * maxWidth) / width);
}

interface Fonts {
  heading: string;
  headingWeight: string;
  price: string;
  priceWeight: string;
  body: string;
  bodyBold: string;
  bodySemi: string;
  ml: string;
  mlBold: string;
}

function resolveFonts(style: PosterStyle): Fonts {
  const italic = style.headingItalic ? "italic " : "";
  return {
    heading: stack(style.headingFont, style.mlFont),
    headingWeight: `${italic}${fontWeight(style.headingFont, 800)}`,
    price: stack(style.priceFont, style.mlFont),
    priceWeight: fontWeight(style.priceFont, 800),
    body: stack(style.bodyFont, style.mlFont),
    bodyBold: fontWeight(style.bodyFont, 700),
    bodySemi: fontWeight(style.bodyFont, 600),
    ml: `${fontFamily(style.mlFont)}, ${stack(style.bodyFont, style.mlFont)}`,
    mlBold: fontWeight(style.mlFont, 800),
  };
}

function splitPrice(value: number) {
  const text = formatPrice(value);
  const dot = text.indexOf(".");
  return dot < 0 ? { main: text, dec: "" } : { main: text.slice(0, dot), dec: text.slice(dot) };
}

interface Ctx {
  geo: PosterGeometry;
  style: PosterStyle;
  content: PosterContent;
  store: Store;
  fonts: Fonts;
  validity: string;
  seed: string;
}

// ---------- main component ----------

export default function PosterCanvas({
  poster,
  store,
  items,
  page,
  displayWidth,
  selectedId,
  onSelectItem,
  stageRef,
  showEmptyHint,
  onReady,
}: PosterCanvasProps) {
  const style = useMemo(() => normalizeStyle(poster.style), [poster.style]);
  const content = useMemo(() => normalizeContent(poster.content), [poster.content]);
  const layout = useMemo(() => normalizeLayout(poster.layout), [poster.layout]);

  const fontKeys = useMemo<FontKey[]>(
    () => [style.headingFont, style.priceFont, style.bodyFont, style.mlFont],
    [style.headingFont, style.priceFont, style.bodyFont, style.mlFont],
  );
  const fontsKey = fontKeys.join(",");
  const [loadedFonts, setLoadedFonts] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPosterFonts(fontKeys).then(() => {
      if (!cancelled) setLoadedFonts(fontsKey);
    });
    return () => {
      cancelled = true;
    };
  }, [fontKeys, fontsKey]);

  const geo = posterGeometry({ layout, content, style }, store, items.length);
  const safePage = Math.min(page, geo.pages - 1);
  const visible = pageItems(items, geo, safePage);
  const cells = cellsFor(geo, visible.length);

  const imageUrls = useMemo(
    () =>
      [
        ...visible.map((i) => i.imageUrl),
        content.showLogo ? store.logoUrl : "",
        content.showHero ? content.heroImageUrl : "",
      ].filter(Boolean),
    [visible, content.showLogo, content.showHero, content.heroImageUrl, store.logoUrl],
  );
  const imagesReady = useImages(imageUrls);
  const fontsReady = loadedFonts === fontsKey;

  useEffect(() => {
    if (!fontsReady || !imagesReady || !onReady) return;
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => onReady());
    });
    return () => cancelAnimationFrame(id);
  }, [fontsReady, imagesReady, onReady]);

  const scale = displayWidth / geo.width;
  const fonts = resolveFonts(style);
  const ctx: Ctx = {
    geo,
    style,
    content,
    store,
    fonts,
    validity: content.showValidity ? formatValidity(content.validFrom, content.validTo) : "",
    seed: poster.id,
  };
  // Fonts change text metrics, so remount the layer once they are loaded.
  const layerKey = `${fontsKey}:${fontsReady ? 1 : 0}`;

  return (
    <Stage
      ref={stageRef}
      width={Math.round(displayWidth)}
      height={Math.round(geo.height * scale)}
      scaleX={scale}
      scaleY={scale}
      listening={Boolean(onSelectItem)}
    >
      <Layer key={layerKey}>
        <Background ctx={ctx} />
        <Decorations ctx={ctx} layer="back" />
        <Header ctx={ctx} />
        {geo.strip ? <Strip ctx={ctx} box={geo.strip} /> : null}
        {style.cardStyle === "divider" && visible.length ? <GridLines ctx={ctx} cells={cells} /> : null}
        {visible.map((item, index) => (
          <ProductCard
            key={item.id}
            ctx={ctx}
            box={cells[index]}
            item={item}
            imageScale={layout.imageScale}
            selected={selectedId === item.id}
            onSelect={onSelectItem ? () => onSelectItem(item.id) : undefined}
          />
        ))}
        {visible.length === 0 && showEmptyHint ? <EmptyHint ctx={ctx} /> : null}
        {geo.footer ? <Footer ctx={ctx} box={geo.footer} /> : null}
        <Decorations ctx={ctx} layer="front" />
      </Layer>
    </Stage>
  );
}

// ---------- shared pieces ----------

function TitleText({
  text,
  x,
  y,
  width,
  align = "center",
  size,
  family,
  weight,
  fill,
  depth,
  depthColor,
}: {
  text: string;
  x: number;
  y: number;
  width: number;
  align?: "left" | "center" | "right";
  size: number;
  family: string;
  weight: string;
  fill: string;
  depth?: boolean;
  depthColor?: string;
}) {
  if (!text) return null;
  const shade = depthColor ?? mix(fill, "#000000", 0.55);
  const extra = depth
    ? {
        stroke: shade,
        strokeWidth: size * 0.1,
        fillAfterStrokeEnabled: true,
        lineJoin: "round" as const,
        shadowColor: shade,
        shadowOffsetX: size * 0.02,
        shadowOffsetY: size * 0.07,
        shadowBlur: 0,
        shadowOpacity: 1,
      }
    : {};
  return (
    <Text
      x={x}
      y={y}
      width={width}
      align={align}
      text={text}
      fontFamily={family}
      fontStyle={weight}
      fontSize={size}
      lineHeight={1.05}
      fill={fill}
      wrap="none"
      ellipsis
      listening={false}
      {...extra}
    />
  );
}

/** Words in different colours on one line, e.g. "fresh" + "deal". */
function InlineTitle({
  parts,
  x,
  y,
  width,
  align,
  size,
  family,
  weight,
  depth,
  depthColor,
}: {
  parts: Array<{ text: string; color: string }>;
  x: number;
  y: number;
  width: number;
  align: "left" | "center" | "right";
  size: number;
  family: string;
  weight: string;
  depth?: boolean;
  depthColor?: string;
}) {
  const list = parts.filter((p) => p.text);
  const space = measure(" ", size, family, weight) * 0.6;
  const widths = list.map((p) => measure(p.text, size, family, weight));
  const total = widths.reduce((a, b) => a + b, 0) + space * Math.max(0, list.length - 1);
  const start = align === "center" ? x + (width - total) / 2 : align === "right" ? x + width - total : x;
  const xs = widths.map((_, i) => start + widths.slice(0, i).reduce((sum, w) => sum + w + space, 0));
  return (
    <>
      {list.map((part, i) => (
        <TitleText
          key={i}
          text={part.text}
          x={xs[i]}
          y={y}
          width={widths[i] + size}
          align="left"
          size={size}
          family={family}
          weight={weight}
          fill={part.color}
          depth={depth}
          depthColor={depthColor}
        />
      ))}
    </>
  );
}

function fitInline(parts: string[], family: string, weight: string, maxWidth: number, maxSize: number, minSize: number) {
  return fit(parts.filter(Boolean).join(" "), family, weight, maxWidth, maxSize, minSize);
}

function ContainImage({ image, x, y, w, h, alignBottom }: { image: HTMLImageElement; x: number; y: number; w: number; h: number; alignBottom?: boolean }) {
  const s = Math.min(w / image.naturalWidth, h / image.naturalHeight);
  const iw = image.naturalWidth * s;
  const ih = image.naturalHeight * s;
  return <KonvaImage image={image} x={x + (w - iw) / 2} y={alignBottom ? y + h - ih : y + (h - ih) / 2} width={iw} height={ih} listening={false} />;
}

/** Store logo on a box, or the store name when there is no logo. */
function LogoBox({
  ctx,
  x,
  y,
  w,
  h,
  bg,
  color,
  radius,
  shape = "rect",
}: {
  ctx: Ctx;
  x: number;
  y: number;
  w: number;
  h: number;
  bg: string;
  color: string;
  radius: number;
  shape?: "rect" | "circle";
}) {
  const { store, content, fonts, geo } = ctx;
  const logo = content.showLogo && store.logoUrl ? getLoadedImage(store.logoUrl) : null;
  const inset = Math.min(w, h) * (shape === "circle" ? 0.16 : 0.1);
  const nameSize = fit(store.name, fonts.body, fonts.bodyBold, w - inset * 2, h * 0.3, 10 * geo.u);
  return (
    <Group x={x} y={y} listening={false}>
      {isTransparent(bg) ? null : shape === "circle" ? (
        <Circle x={w / 2} y={h / 2} radius={Math.min(w, h) / 2} fill={bg} shadowColor="#000" shadowBlur={14 * geo.u} shadowOpacity={0.18} shadowOffsetY={4 * geo.u} />
      ) : (
        <Rect width={w} height={h} cornerRadius={radius} fill={bg} shadowColor="#000" shadowBlur={10 * geo.u} shadowOpacity={0.15} shadowOffsetY={3 * geo.u} />
      )}
      {logo ? (
        <ContainImage image={logo} x={inset} y={inset} w={w - inset * 2} h={h - inset * 2} />
      ) : (
        <Text
          x={inset}
          y={inset}
          width={w - inset * 2}
          height={h - inset * 2}
          align="center"
          verticalAlign="middle"
          text={store.name}
          fontFamily={fonts.body}
          fontStyle={fonts.bodyBold}
          fontSize={Math.max(nameSize, Math.min(h * 0.2, 26 * geo.u))}
          lineHeight={1.1}
          fill={color}
          wrap="word"
          ellipsis
        />
      )}
    </Group>
  );
}

function Hero({ ctx, x, y, w, h }: { ctx: Ctx; x: number; y: number; w: number; h: number }) {
  const { content } = ctx;
  if (!content.showHero) return null;
  const image = content.heroImageUrl ? getLoadedImage(content.heroImageUrl) : null;
  if (image) return <ContainImage image={image} x={x} y={y} w={w} h={h} alignBottom />;
  if (!content.heroEmoji) return null;
  // No fixed width: Konva drops a glyph wider than its box, and emoji are wider than their font size.
  const size = Math.min(w / 1.25, h * 0.88);
  const glyphW = measure(content.heroEmoji, size, EMOJI_FONT, "normal") || size;
  return (
    <Text
      x={x + (w - glyphW) / 2}
      y={y + (h - size) / 2}
      text={content.heroEmoji}
      fontFamily={EMOJI_FONT}
      fill="#000000"
      fontSize={size}
      lineHeight={1}
      listening={false}
    />
  );
}

function hasHero(content: PosterContent) {
  return content.showHero && Boolean(content.heroImageUrl || content.heroEmoji);
}

function Sticker({ ctx, cx, cy, size }: { ctx: Ctx; cx: number; cy: number; size: number }) {
  const { content, style, fonts, geo } = ctx;
  const text = content.badgeText.trim();
  if (!text) return null;
  const w = measure(text, size, fonts.heading, fonts.headingWeight) + size * 1.2;
  return (
    <Group x={cx} y={cy} rotation={-5} listening={false}>
      <Rect
        x={-w / 2}
        y={-size * 0.85}
        width={w}
        height={size * 1.7}
        cornerRadius={size * 0.4}
        fill={style.badgeBg}
        shadowColor="#000"
        shadowBlur={10 * geo.u}
        shadowOpacity={0.2}
        shadowOffsetY={3 * geo.u}
      />
      <Text
        x={-w / 2}
        y={-size * 0.85}
        width={w}
        height={size * 1.7}
        align="center"
        verticalAlign="middle"
        text={text}
        fontFamily={fonts.heading}
        fontStyle={fonts.headingWeight}
        fontSize={size}
        fill={style.badgeText}
        wrap="none"
      />
    </Group>
  );
}

/** Small rounded tag for dates and short labels. */
function Tag({
  ctx,
  text,
  cx,
  y,
  size,
  bg,
  color,
  maxWidth,
  rotation = 0,
  align = "center",
}: {
  ctx: Ctx;
  text: string;
  cx: number;
  y: number;
  size: number;
  bg: string;
  color: string;
  maxWidth: number;
  rotation?: number;
  align?: "center" | "left";
}) {
  const { fonts } = ctx;
  if (!text) return null;
  const s = fit(text, fonts.body, fonts.bodyBold, maxWidth - size * 1.4, size, size * 0.5);
  const w = Math.min(maxWidth, measure(text, s, fonts.body, fonts.bodyBold) + s * 1.4);
  const h = s * 1.8;
  const x = align === "center" ? cx - w / 2 : cx;
  return (
    <Group x={x} y={y} rotation={rotation} listening={false}>
      <Rect width={w} height={h} cornerRadius={h * 0.22} fill={bg} />
      <Text width={w} height={h} align="center" verticalAlign="middle" text={text} fontFamily={fonts.body} fontStyle={fonts.bodyBold} fontSize={s} fill={color} wrap="none" />
    </Group>
  );
}

// ---------- background ----------

function Background({ ctx }: { ctx: Ctx }) {
  const { geo, style, seed } = ctx;
  const { width: W, height: H, u } = geo;
  const rand = seededRandom(`${seed}:bg`);
  let pattern: ReactNode = null;

  if (style.bgPattern === "wood") {
    const planks = 7;
    const line = mix(style.bgBottom, "#000000", 0.12);
    pattern = (
      <Group listening={false}>
        {Array.from({ length: planks - 1 }, (_, i) => (
          <Rect key={`p${i}`} x={((i + 1) * W) / planks - 1.5 * u} y={0} width={3 * u} height={H} fill={line} opacity={0.55} />
        ))}
        {Array.from({ length: 60 }, (_, i) => {
          const x = rand() * W;
          const y = rand() * H;
          const len = (60 + rand() * 160) * u;
          return (
            <Line
              key={`g${i}`}
              points={[x, y, x + (rand() - 0.5) * 10 * u, y + len / 2, x + (rand() - 0.5) * 6 * u, y + len]}
              tension={0.6}
              stroke={line}
              strokeWidth={(1 + rand() * 1.5) * u}
              opacity={0.35}
            />
          );
        })}
      </Group>
    );
  } else if (style.bgPattern === "paper") {
    const dot = mix(style.bgBottom, "#5a4a2a", 0.5);
    pattern = (
      <Group listening={false} opacity={0.16}>
        {Array.from({ length: 420 }, (_, i) => (
          <Circle key={i} x={rand() * W} y={rand() * H} radius={(0.6 + rand() * 1.8) * u} fill={dot} />
        ))}
      </Group>
    );
  } else if (style.bgPattern === "bokeh") {
    pattern = (
      <Group listening={false}>
        {Array.from({ length: 22 }, (_, i) => {
          const r = (50 + rand() * 170) * u;
          return (
            <Circle
              key={i}
              x={rand() * W}
              y={rand() * H}
              radius={r}
              fillRadialGradientStartPoint={{ x: 0, y: 0 }}
              fillRadialGradientEndPoint={{ x: 0, y: 0 }}
              fillRadialGradientStartRadius={0}
              fillRadialGradientEndRadius={r}
              fillRadialGradientColorStops={[0, "rgba(255,255,240,0.55)", 0.6, "rgba(255,255,220,0.18)", 1, "rgba(255,255,255,0)"]}
            />
          );
        })}
      </Group>
    );
  }

  return (
    <>
      <Rect
        width={W}
        height={H}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: H }}
        fillLinearGradientColorStops={[0, style.bgTop, 1, style.bgBottom]}
        listening={false}
      />
      {pattern}
    </>
  );
}

// ---------- header ----------

function Header({ ctx }: { ctx: Ctx }) {
  switch (ctx.style.headerStyle) {
    case "split":
      return <SplitHeader ctx={ctx} />;
    case "arc":
      return <ArcHeader ctx={ctx} />;
    case "blob":
      return <BlobHeader ctx={ctx} />;
    case "circle":
      return <CircleHeader ctx={ctx} />;
    case "stack":
      return <StackHeader ctx={ctx} />;
    case "script":
      return <ScriptHeader ctx={ctx} />;
    default:
      return <ClassicHeader ctx={ctx} />;
  }
}

function bannerPath(ctx: Konva.Context, width: number, height: number, wave: number) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width, 0);
  ctx.lineTo(width, height - wave);
  ctx.quadraticCurveTo(width / 2, height + wave, 0, height - wave);
  ctx.closePath();
}

/** banner / ribbon / plain: centred title. */
function ClassicHeader({ ctx }: { ctx: Ctx }) {
  const { geo, style, content, store, fonts } = ctx;
  const { width: W, u, pad } = geo;
  const hh = geo.header.h;
  const wave = 24 * u;
  const banner = style.headerStyle === "banner";
  const ribbon = style.headerStyle === "ribbon";
  // On banner the text sits on the header colour; otherwise on the poster background.
  const onBg = banner ? style.headerText : style.headerBg;

  const topY = 22 * u;
  const topH = hh * 0.22;
  const logo = content.showLogo && store.logoUrl ? getLoadedImage(store.logoUrl) : null;
  const logoSize = topH;
  const nameX = pad + (logo ? logoSize + 14 * u : 0);
  const badgeSize = topH * 0.4;
  const badgeW = content.badgeText.trim() ? measure(content.badgeText.trim(), badgeSize, fonts.heading, fonts.headingWeight) + badgeSize * 1.2 : 0;

  const hasMl = Boolean(content.headlineMl.trim());
  const parts = [content.headline.trim(), content.headline2.trim()];
  const maxHeadline = hh * (hasMl ? 0.31 : 0.4);
  const headlineSize = fitInline(parts, fonts.heading, fonts.headingWeight, W - pad * 2 - (ribbon ? 80 * u : 0), maxHeadline, 20 * u);
  const headlineY = topY + topH + hh * (hasMl ? 0.03 : 0.07);
  const mlSize = fit(content.headlineMl, fonts.ml, fonts.mlBold, W - pad * 2, hh * 0.15, 14 * u);
  const mlY = headlineY + headlineSize * 1.04;

  const titleW = measure(parts.filter(Boolean).join(" "), headlineSize, fonts.heading, fonts.headingWeight);
  const ribbonW = ribbon ? Math.min(W - pad, titleW + headlineSize * 1.3) : 0;
  const ribbonH = headlineSize * 1.3;
  const ribbonX = (W - ribbonW) / 2;
  const ribbonY = headlineY - (ribbonH - headlineSize) / 2;
  const notch = ribbonH * 0.28;
  const mainColor = ribbon ? style.headerText : style.headlineColor;
  const secondColor = ribbon ? style.panelBg : banner ? style.headerText : style.headerBg;

  return (
    <Group listening={false}>
      {banner ? (
        <>
          <Shape
            sceneFunc={(c, shape) => {
              bannerPath(c, W, hh, wave);
              c.fillStrokeShape(shape);
            }}
            fill={style.headerBg}
          />
          {style.decoration === "rays" ? (
            <Group clipFunc={(c) => bannerPath(c, W, hh, wave)}>
              <Shape
                opacity={0.28}
                fill={style.decorationColor}
                sceneFunc={(c, shape) => {
                  const cx = W / 2;
                  const cy = hh * 0.6;
                  const r = W * 1.2;
                  const n = 22;
                  c.beginPath();
                  for (let i = 0; i < n; i++) {
                    const a1 = (i / n) * Math.PI * 2;
                    const a2 = a1 + Math.PI / n;
                    c.moveTo(cx, cy);
                    c.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
                    c.lineTo(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
                    c.closePath();
                  }
                  c.fillShape(shape);
                }}
              />
            </Group>
          ) : null}
        </>
      ) : null}

      {logo ? (
        <Group x={pad} y={topY}>
          <Rect width={logoSize} height={logoSize} cornerRadius={14 * u} fill="#ffffff" shadowColor="#000" shadowBlur={8 * u} shadowOpacity={0.15} />
          <ContainImage image={logo} x={6 * u} y={6 * u} w={logoSize - 12 * u} h={logoSize - 12 * u} />
        </Group>
      ) : null}
      <Text
        x={nameX}
        y={topY}
        height={topH}
        width={Math.max(10, W - nameX - pad - badgeW - 20 * u)}
        verticalAlign="middle"
        text={content.kicker.trim() ? `${store.name}  •  ${content.kicker.trim()}` : store.name}
        fontFamily={fonts.body}
        fontStyle={fonts.bodyBold}
        fontSize={topH * 0.42}
        fill={onBg}
        wrap="none"
        ellipsis
      />
      <Sticker ctx={ctx} cx={W - pad - badgeW / 2} cy={topY + topH / 2} size={badgeSize} />

      {ribbon && titleW ? (
        <Line
          closed
          fill={style.headerBg}
          shadowColor="#000"
          shadowBlur={12 * u}
          shadowOpacity={0.18}
          shadowOffsetY={4 * u}
          points={[
            ribbonX - notch,
            ribbonY,
            ribbonX + ribbonW + notch,
            ribbonY,
            ribbonX + ribbonW,
            ribbonY + ribbonH / 2,
            ribbonX + ribbonW + notch,
            ribbonY + ribbonH,
            ribbonX - notch,
            ribbonY + ribbonH,
            ribbonX,
            ribbonY + ribbonH / 2,
          ]}
        />
      ) : null}
      <InlineTitle
        parts={[
          { text: parts[0], color: mainColor },
          { text: parts[1], color: secondColor },
        ]}
        x={pad}
        y={headlineY}
        width={W - pad * 2}
        align="center"
        size={headlineSize}
        family={fonts.heading}
        weight={fonts.headingWeight}
        depth={style.headline3d}
      />
      {hasMl ? (
        <Text
          x={pad}
          y={mlY}
          width={W - pad * 2}
          align="center"
          text={content.headlineMl}
          fontFamily={fonts.ml}
          fontStyle={fonts.mlBold}
          fontSize={mlSize}
          lineHeight={1.25}
          fill={onBg}
          wrap="none"
          ellipsis
        />
      ) : null}
    </Group>
  );
}

/** Colour block, title left, offer box + date + logo ribbon right. */
function SplitHeader({ ctx }: { ctx: Ctx }) {
  const { geo, style, content, fonts, validity } = ctx;
  const { width: W, u, pad } = geo;
  const hh = geo.header.h;
  const cut = 44 * u;
  const blockPoints = [0, 0, W, 0, W, hh, cut, hh, 0, hh - cut];

  const rightX = W * 0.6;
  const leftW = rightX - pad - 10 * u;
  const kickerSize = fit(content.kicker, fonts.body, fonts.bodySemi, leftW, hh * 0.12, 12 * u);
  const h1 = fit(content.headline, fonts.heading, fonts.headingWeight, leftW, hh * 0.27, 18 * u);
  const h2 = fit(content.headline2, fonts.heading, fonts.headingWeight, leftW, hh * 0.21, 16 * u);
  const mlSize = fit(content.headlineMl, fonts.ml, fonts.mlBold, leftW, hh * 0.09, 12 * u);
  const subSize = fit(content.subheadline, fonts.body, fonts.bodySemi, leftW, hh * 0.075, 11 * u);
  const blocks = [
    content.kicker ? kickerSize * 1.15 : 0,
    content.headline ? h1 * 1.02 : 0,
    content.headline2 ? h2 * 1.05 : 0,
    content.headlineMl ? mlSize * 1.4 : 0,
    content.subheadline ? subSize * 1.6 : 0,
  ];
  const total = blocks.reduce((a, b) => a + b, 0);
  let y = Math.max(22 * u, (hh - total) / 2 - 6 * u);
  const yKicker = y;
  y += blocks[0];
  const yH1 = y;
  y += blocks[1];
  const yH2 = y;
  y += blocks[2];
  const yMl = y;
  y += blocks[3];
  const ySub = y + subSize * 0.4;

  // Logo hangs from the top-right like a bookmark.
  const ribbonW = Math.min(W * 0.2, hh * 0.52);
  const ribbonH = ribbonW * 1.05;
  const ribbonX = W - pad - ribbonW;
  const notch = ribbonW * 0.18;

  const hasOffer = Boolean(content.offerValue.trim());
  const boxW = W * 0.2;
  const boxH = hh * 0.34;
  const boxX = rightX;
  const boxY = Math.min(hh - boxH - 26 * u, ribbonH + 16 * u);
  const labelSize = fit(content.offerLabel, fonts.body, fonts.bodyBold, boxW * 0.86, boxH * 0.16, 10 * u);
  const valueSize = fit(content.offerValue, fonts.heading, fonts.headingWeight, boxW * 0.62, boxH * 0.56, 14 * u);
  const valueW = measure(content.offerValue, valueSize, fonts.heading, fonts.headingWeight);

  const dateX = hasOffer ? boxX + boxW + 16 * u : rightX;
  const dateW = W - pad - dateX;
  const dateSize = fit(validity, fonts.heading, fonts.headingWeight, dateW, boxH * 0.3, 12 * u);

  return (
    <Group listening={false}>
      <Line closed points={blockPoints} fill={style.headerBg} />
      {style.bgPattern === "diagonal" ? (
        <Group clipFunc={(c) => {
          c.beginPath();
          c.moveTo(0, 0);
          c.lineTo(W, 0);
          c.lineTo(W, hh);
          c.lineTo(cut, hh);
          c.lineTo(0, hh - cut);
          c.closePath();
        }}>
          {Array.from({ length: 40 }, (_, i) => (
            <Line key={i} points={[i * 60 * u - hh, hh, i * 60 * u, 0]} stroke={mix(style.headerBg, style.headerText, 0.12)} strokeWidth={2 * u} />
          ))}
        </Group>
      ) : null}
      <Line closed points={[0, hh - cut - 18 * u, 0, hh - cut + 10 * u, cut + 28 * u, hh + 10 * u, cut + 46 * u, hh + 10 * u]} fill={style.panelBg} />
      <Line closed points={[W, hh - 40 * u, W, hh + 10 * u, W - 60 * u, hh + 10 * u]} fill={style.panelBg} />

      <TitleText text={content.kicker} x={pad} y={yKicker} width={leftW} align="left" size={kickerSize} family={fonts.body} weight={fonts.bodySemi} fill={style.headerText} />
      <TitleText text={content.headline} x={pad} y={yH1} width={leftW} align="left" size={h1} family={fonts.heading} weight={fonts.headingWeight} fill={style.headlineColor} depth={style.headline3d} />
      <TitleText text={content.headline2} x={pad} y={yH2} width={leftW} align="left" size={h2} family={fonts.heading} weight={fonts.headingWeight} fill={style.headerText} depth={style.headline3d} />
      <TitleText text={content.headlineMl} x={pad} y={yMl} width={leftW} align="left" size={mlSize} family={fonts.ml} weight={fonts.mlBold} fill={style.headerText} />
      <TitleText text={content.subheadline} x={pad} y={ySub} width={leftW} align="left" size={subSize} family={fonts.body} weight={fonts.bodySemi} fill={style.headerText} />

      <Group x={ribbonX} y={0}>
        <Line closed points={[0, 0, ribbonW, 0, ribbonW, ribbonH, ribbonW / 2, ribbonH - notch, 0, ribbonH]} fill={style.panelBg} shadowColor="#000" shadowBlur={10 * u} shadowOpacity={0.25} shadowOffsetY={4 * u} />
      </Group>
      <LogoBox ctx={ctx} x={ribbonX + ribbonW * 0.12} y={ribbonH * 0.1} w={ribbonW * 0.76} h={ribbonH * 0.62} bg="#00000000" color={style.panelText} radius={0} />

      {hasOffer ? (
        <Group x={boxX} y={boxY}>
          <Rect width={boxW} height={boxH} fill={style.panelBg} cornerRadius={4 * u} shadowColor="#000" shadowBlur={12 * u} shadowOpacity={0.25} shadowOffsetY={5 * u} />
          <Text y={boxH * 0.1} width={boxW} align="center" text={content.offerLabel} fontFamily={fonts.body} fontStyle={fonts.bodyBold} fontSize={labelSize} fill={style.panelText} wrap="none" />
          <Text x={(boxW - valueW - boxW * 0.2) / 2} y={boxH * 0.3} text={content.offerValue} fontFamily={fonts.heading} fontStyle={fonts.headingWeight} fontSize={valueSize} lineHeight={1} fill={style.panelText} wrap="none" />
          <Text
            x={(boxW - valueW - boxW * 0.2) / 2 + valueW + 4 * u}
            y={boxH * 0.3 + valueSize * 0.5}
            text="OFF"
            fontFamily={fonts.body}
            fontStyle={fonts.bodyBold}
            fontSize={valueSize * 0.3}
            fill={style.panelText}
            wrap="none"
          />
        </Group>
      ) : null}
      {validity ? (
        <>
          <Tag ctx={ctx} text="VALID ON" cx={dateX} y={boxY} size={boxH * 0.13} bg={style.panelBg} color={style.panelText} maxWidth={dateW} align="left" />
          <Text
            x={dateX}
            y={boxY + boxH * 0.36}
            width={dateW}
            text={validity}
            fontFamily={fonts.heading}
            fontStyle={fonts.headingWeight}
            fontSize={dateSize}
            lineHeight={1.1}
            fill={style.headlineColor}
            wrap="word"
            listening={false}
          />
        </>
      ) : null}
    </Group>
  );
}

/** Big half-circle at the top centre. */
function ArcHeader({ ctx }: { ctx: Ctx }) {
  const { geo, style, content, fonts, validity } = ctx;
  const { width: W, u } = geo;
  const hh = geo.header.h;
  const rx = W * 0.42;
  const ry = hh * 1.08;
  const cy = hh - ry;
  const inner = rx * 1.55;
  const x0 = W / 2 - inner / 2;

  const logoH = hh * 0.2;
  const h1 = fitInline([content.headline, content.headline2], fonts.heading, fonts.headingWeight, inner, hh * 0.3, 18 * u);
  const mlSize = fit(content.headlineMl, fonts.ml, fonts.mlBold, inner * 0.9, hh * 0.1, 12 * u);
  const dateSize = fit(validity, fonts.body, fonts.bodyBold, inner * 0.8, hh * 0.08, 11 * u);
  const yLogo = 18 * u;
  const yTitle = yLogo + logoH + hh * 0.1;
  const yMl = yTitle + h1 * 1.05;
  const yDate = yMl + (content.headlineMl ? mlSize * 1.35 : 0);

  return (
    <Group listening={false}>
      <Ellipse x={W / 2} y={cy} radiusX={rx} radiusY={ry} fill={style.headerBg} shadowColor="#000" shadowBlur={20 * u} shadowOpacity={0.15} shadowOffsetY={6 * u} />
      <LogoBox ctx={ctx} x={W / 2 - inner * 0.35} y={yLogo} w={inner * 0.7} h={logoH} bg="#00000000" color={style.headerText} radius={0} />
      <Path
        x={W / 2 - inner * 0.42}
        y={yLogo + logoH + hh * 0.025}
        data={`M0 ${10 * u} Q ${inner * 0.42} ${-8 * u} ${inner * 0.84} ${6 * u}`}
        stroke="#ffffff"
        strokeWidth={7 * u}
        lineCap="round"
        opacity={0.9}
      />
      <InlineTitle
        parts={[
          { text: content.headline, color: style.headerText },
          { text: content.headline2, color: style.headlineColor },
        ]}
        x={x0}
        y={yTitle}
        width={inner}
        align="center"
        size={h1}
        family={fonts.heading}
        weight={fonts.headingWeight}
        depth={style.headline3d}
      />
      <TitleText text={content.headlineMl} x={x0} y={yMl} width={inner} size={mlSize} family={fonts.ml} weight={fonts.mlBold} fill={style.headerText} />
      <TitleText text={validity} x={x0} y={yDate} width={inner} size={dateSize} family={fonts.body} weight={`italic ${fonts.bodyBold}`} fill={style.headerText} />
      <Sticker ctx={ctx} cx={W / 2 + rx * 0.82} cy={hh * 0.2} size={hh * 0.08} />
    </Group>
  );
}

/** Large curved shape top-right with a 3D title in a circle. */
function BlobHeader({ ctx }: { ctx: Ctx }) {
  const { geo, style, content, fonts, validity } = ctx;
  const { width: W, u, pad } = geo;
  const hh = geo.header.h;
  const blob = `M ${W * 0.2} 0 L ${W} 0 L ${W} ${hh * 0.92} C ${W * 0.78} ${hh * 1.04} ${W * 0.52} ${hh * 0.98} ${W * 0.4} ${hh * 0.72} C ${W * 0.3} ${hh * 0.5} ${W * 0.18} ${hh * 0.3} ${W * 0.2} 0 Z`;

  const r = Math.min(hh * 0.46, W * 0.24);
  const cx = pad + r * 1.02;
  const cy = hh * 0.5;
  const titleW = r * 2.1;
  const h1 = fit(content.headline, fonts.heading, fonts.headingWeight, titleW, r * 0.72, 18 * u);
  const h2 = fit(content.headline2, fonts.heading, fonts.headingWeight, titleW, r * 0.72, 18 * u);
  const mlSize = fit(content.headlineMl, fonts.ml, fonts.mlBold, r * 1.25, r * 0.17, 10 * u);
  const blockH = (content.headline ? h1 : 0) + (content.headline2 ? h2 : 0) + (content.headlineMl ? mlSize * 1.3 : 0);

  const rightX = W * 0.58;
  const rightW = W - pad - rightX;
  const logoH = hh * 0.3;
  const subSize = fit(content.subheadline, fonts.body, fonts.bodyBold, rightW, hh * 0.08, 11 * u);
  const yLogo = hh * 0.12;
  const ySub = yLogo + logoH + hh * 0.06;
  const yDate = ySub + (content.subheadline ? subSize * 1.6 : 0);

  return (
    <Group listening={false}>
      <Path data={blob} fill={style.headerBg} />
      <Circle x={cx} y={cy} radius={r} fill={mix(style.headerBg, "#ffffff", 0.08)} stroke={mix(style.headlineColor, style.headerBg, 0.35)} strokeWidth={10 * u} shadowColor="#000" shadowBlur={18 * u} shadowOpacity={0.2} />
      <Group x={cx} y={cy} rotation={-7}>
        <TitleText text={content.headline} x={-titleW / 2} y={-blockH / 2} width={titleW} size={h1} family={fonts.heading} weight={fonts.headingWeight} fill={style.headerText} depth={style.headline3d} depthColor={mix(style.headerBg, "#000000", 0.45)} />
        <TitleText text={content.headline2} x={-titleW / 2} y={-blockH / 2 + (content.headline ? h1 : 0)} width={titleW} size={h2} family={fonts.heading} weight={fonts.headingWeight} fill={style.headlineColor} depth={style.headline3d} depthColor={mix(style.headerBg, "#000000", 0.45)} />
        <TitleText text={content.headlineMl} x={-r * 0.65} y={blockH / 2 - mlSize * 1.2} width={r * 1.3} size={mlSize} family={fonts.ml} weight={fonts.mlBold} fill={style.headerText} />
      </Group>
      <LogoBox ctx={ctx} x={rightX + rightW * 0.1} y={yLogo} w={rightW * 0.8} h={logoH} bg={style.panelBg} color={style.panelText} radius={14 * u} />
      <TitleText text={content.subheadline} x={rightX} y={ySub} width={rightW} size={subSize} family={fonts.body} weight={fonts.bodyBold} fill={style.headerText} />
      {validity ? <Tag ctx={ctx} text={validity} cx={rightX + rightW / 2} y={yDate} size={hh * 0.075} bg={style.stripBg} color={style.stripText} maxWidth={rightW} /> : null}
      <Sticker ctx={ctx} cx={W - pad - 60 * u} cy={hh * 0.06 + 20 * u} size={hh * 0.06} />
    </Group>
  );
}

/** Title in a big circle on the left; store info and hero image on the right. */
function CircleHeader({ ctx }: { ctx: Ctx }) {
  const { geo, style, content, store, fonts, validity } = ctx;
  const { width: W, u, pad } = geo;
  const hh = geo.header.h;
  const inset = pad * 0.45;
  const panel = !isTransparent(style.headerBg);

  const r = Math.min(hh * 0.44, W * 0.23);
  const cx = pad + r;
  const cy = hh * 0.47;
  const lines = [content.kicker, content.headline, content.headline2].filter((l) => l.trim());
  const mlTitle = !lines.length && content.headlineMl.trim();
  const titleW = r * 1.62;
  let titleNodes: ReactNode = null;
  if (mlTitle) {
    // Multi-word Malayalam titles are split over two lines so they stay large inside the circle.
    const mlLines = content.headlineMl.trim().split(/\s+/).filter(Boolean);
    const rows = mlLines.length > 1 ? [mlLines.slice(0, Math.ceil(mlLines.length / 2)).join(" "), mlLines.slice(Math.ceil(mlLines.length / 2)).join(" ")] : mlLines;
    const size = Math.min(...rows.map((row) => fit(row, fonts.ml, fonts.mlBold, titleW, r * (rows.length > 1 ? 0.42 : 0.5), 12 * u)));
    const lineH = size * 1.3;
    titleNodes = rows.map((row, i) => (
      <TitleText key={i} text={row} x={-titleW / 2} y={-(rows.length * lineH) / 2 + i * lineH} width={titleW} size={size} family={fonts.ml} weight={fonts.mlBold} fill={style.headlineColor} depth={style.headline3d} />
    ));
  } else {
    const sizes = lines.map((l, i) => fit(l, fonts.heading, fonts.headingWeight, titleW * (i === 0 && lines.length > 2 ? 0.8 : 1), r * (lines.length > 2 ? 0.44 : 0.56), 14 * u));
    const totalH = sizes.reduce((a, b) => a + b * 1.02, 0);
    let y = -totalH / 2;
    titleNodes = lines.map((line, i) => {
      const node = <TitleText key={i} text={line} x={-titleW / 2} y={y} width={titleW} size={sizes[i]} family={fonts.heading} weight={fonts.headingWeight} fill={style.headlineColor} depth={style.headline3d} />;
      y += sizes[i] * 1.02;
      return node;
    });
  }

  const rightX = cx + r + 24 * u;
  const rightW = W - pad - rightX;
  const heroOn = hasHero(content);
  const infoW = heroOn ? rightW * 0.52 : rightW;
  const heroX = rightX + infoW + 10 * u;
  const logoH = hh * 0.26;
  const nameSize = fit(store.name, fonts.body, fonts.bodyBold, infoW, hh * 0.1, 12 * u);
  const subSize = fit(content.subheadline, fonts.body, fonts.bodySemi, infoW, hh * 0.06, 10 * u);
  const mlSize = mlTitle ? 0 : fit(content.headlineMl, fonts.ml, fonts.mlBold, infoW, hh * 0.08, 10 * u);
  const contact = [store.phone, store.address].filter(Boolean).join("  •  ");
  const contactSize = fit(contact, fonts.body, fonts.bodySemi, infoW, hh * 0.05, 9 * u);
  const logo = content.showLogo && store.logoUrl ? getLoadedImage(store.logoUrl) : null;
  let y = hh * 0.1;
  const yLogo = y;
  if (logo) y += logoH + 8 * u;
  const yName = y;
  y += nameSize * 1.25;
  const ySub = y;
  y += content.subheadline ? subSize * 1.5 : 0;
  const yContact = y;
  y += contact ? contactSize * 1.6 : 0;
  const yMl = y;

  return (
    <Group listening={false}>
      {panel ? <Rect x={inset} y={-20 * u} width={W - inset * 2} height={hh + 4 * u} cornerRadius={26 * u} fill={style.headerBg} /> : null}
      <Hero ctx={ctx} x={heroX} y={hh * 0.06} w={W - pad - heroX + pad * 0.4} h={hh * 0.9} />
      {logo ? <ContainImage image={logo} x={rightX + (infoW - logoH * 1.4) / 2} y={yLogo} w={logoH * 1.4} h={logoH} /> : null}
      <TitleText text={store.name} x={rightX} y={yName} width={infoW} size={nameSize} family={fonts.body} weight={fonts.bodyBold} fill={style.headerText} />
      <TitleText text={content.subheadline} x={rightX} y={ySub} width={infoW} size={subSize} family={content.subheadline.match(/[ഀ-ൿ]/) ? fonts.ml : fonts.body} weight={fonts.bodySemi} fill={style.headerText} />
      <TitleText text={contact} x={rightX} y={yContact} width={infoW} size={contactSize} family={fonts.body} weight={fonts.bodySemi} fill={style.headerText} />
      {mlSize ? <TitleText text={content.headlineMl} x={rightX} y={yMl} width={infoW} size={mlSize} family={fonts.ml} weight={fonts.mlBold} fill={style.headlineColor} /> : null}

      <Circle x={cx} y={cy} radius={r} fill={style.panelBg} stroke={mix(style.panelBg, "#000000", 0.2)} strokeWidth={3 * u} shadowColor="#000" shadowBlur={18 * u} shadowOpacity={0.22} shadowOffsetY={6 * u} />
      <Group x={cx} y={cy} rotation={style.headingItalic ? -6 : 0}>
        {titleNodes}
      </Group>
      {validity ? <Tag ctx={ctx} text={validity} cx={cx} y={cy + r * 0.78} size={r * 0.13} bg={style.stripBg} color={style.stripText} maxWidth={r * 1.9} rotation={-3} /> : null}
      <Sticker ctx={ctx} cx={cx + r * 0.85} cy={cy - r * 0.85} size={r * 0.12} />
    </Group>
  );
}

/** Huge stacked title, optional hero picture on the left. */
function StackHeader({ ctx }: { ctx: Ctx }) {
  const { geo, style, content, store, fonts } = ctx;
  const { width: W, u, pad } = geo;
  const hh = geo.header.h;
  const heroOn = hasHero(content);
  const heroW = heroOn ? W * 0.3 : 0;
  const titleX = pad + heroW + (heroOn ? 10 * u : 0);
  const titleW = W - pad - titleX;

  const logo = content.showLogo && store.logoUrl ? getLoadedImage(store.logoUrl) : null;
  const topH = hh * 0.13;
  const nameSize = topH * 0.6;
  const kickerSize = fit(content.kicker, fonts.body, fonts.bodyBold, titleW, hh * 0.09, 10 * u);
  const h1 = fit(content.headline, fonts.heading, fonts.headingWeight, titleW, hh * 0.3, 18 * u);
  const h2 = fit(content.headline2, fonts.heading, fonts.headingWeight, titleW, hh * 0.3, 18 * u);
  const ml = content.headlineMl.trim();
  const mlSize = fit(ml, fonts.ml, fonts.mlBold, titleW * 0.8, hh * 0.085, 11 * u);
  const mlRibbonH = mlSize * 1.7;

  const blocks = [
    content.kicker ? kickerSize * 1.2 : 0,
    content.headline ? h1 * 1.02 : 0,
    ml ? mlRibbonH + 6 * u : 0,
    content.headline2 ? h2 * 1.02 : 0,
  ];
  const total = blocks.reduce((a, b) => a + b, 0);
  let y = topH + 18 * u + Math.max(0, (hh - topH - 18 * u - total) / 2);
  const yK = y;
  y += blocks[0];
  const y1 = y;
  y += blocks[1];
  const yMl = y;
  y += blocks[2];
  const y2 = y;

  const mlW = Math.min(titleW, measure(ml, mlSize, fonts.ml, fonts.mlBold) + mlSize * 2);
  const depthColor = style.headline3d ? (luminanceDark(style.headerText) ? style.headerText : mix(style.headlineColor, "#000000", 0.55)) : undefined;

  return (
    <Group listening={false}>
      {heroOn ? <Hero ctx={ctx} x={pad} y={topH + 10 * u} w={heroW} h={hh - topH - 10 * u} /> : null}
      {logo ? (
        <ContainImage image={logo} x={pad} y={14 * u} w={topH * 2.4} h={topH} />
      ) : (
        <Text x={pad} y={14 * u} height={topH} verticalAlign="middle" width={W * 0.6} text={store.name} fontFamily={fonts.body} fontStyle={fonts.bodyBold} fontSize={nameSize} fill={style.headerText} wrap="none" ellipsis />
      )}
      <Sticker ctx={ctx} cx={W - pad - 70 * u} cy={14 * u + topH / 2} size={topH * 0.45} />
      <TitleText text={content.kicker} x={titleX} y={yK} width={titleW} size={kickerSize} family={fonts.body} weight={fonts.bodyBold} fill={style.headerText} />
      <TitleText text={content.headline} x={titleX} y={y1} width={titleW} size={h1} family={fonts.heading} weight={fonts.headingWeight} fill={style.headlineColor} depth={style.headline3d} depthColor={depthColor} />
      {ml ? (
        <Group x={titleX + (titleW - mlW) / 2} y={yMl} rotation={-2}>
          <Rect width={mlW} height={mlRibbonH} cornerRadius={mlRibbonH * 0.18} fill={style.panelBg} shadowColor="#000" shadowBlur={8 * u} shadowOpacity={0.2} shadowOffsetY={3 * u} />
          <Text width={mlW} height={mlRibbonH} align="center" verticalAlign="middle" text={ml} fontFamily={fonts.ml} fontStyle={fonts.mlBold} fontSize={mlSize} fill={style.panelText} wrap="none" />
        </Group>
      ) : null}
      <TitleText text={content.headline2} x={titleX} y={y2} width={titleW} size={h2} family={fonts.heading} weight={fonts.headingWeight} fill={style.headline3d ? style.headlineColor : style.headerText} depth={style.headline3d} depthColor={depthColor} />
    </Group>
  );
}

function luminanceDark(hex: string) {
  return readableOn(hex) === "#ffffff";
}

/** Logo in a circle on the left, two-colour title on the right. */
function ScriptHeader({ ctx }: { ctx: Ctx }) {
  const { geo, style, content, fonts, validity } = ctx;
  const { width: W, u, pad } = geo;
  const hh = geo.header.h;
  const r = Math.min(hh * 0.38, W * 0.17);
  const cx = pad + r;
  const cy = hh * 0.44;
  const titleX = cx + r + 26 * u;
  const titleW = W - pad - titleX;
  const size = fitInline([content.headline, content.headline2], fonts.heading, fonts.headingWeight, titleW, hh * 0.46, 20 * u);
  const yTitle = hh * 0.12;
  const yBar = yTitle + size * 1.08;
  const barText = [content.subheadline, validity].filter(Boolean).join("  •  ").toUpperCase();
  const mlSize = fit(content.headlineMl, fonts.ml, fonts.mlBold, titleW, hh * 0.1, 11 * u);

  return (
    <Group listening={false}>
      <LogoBox ctx={ctx} x={cx - r} y={cy - r} w={r * 2} h={r * 2} bg={style.panelBg} color={style.panelText} radius={r} shape="circle" />
      <InlineTitle
        parts={[
          { text: content.headline, color: style.headerText },
          { text: content.headline2, color: style.headlineColor },
        ]}
        x={titleX}
        y={yTitle}
        width={titleW}
        align="center"
        size={size}
        family={fonts.heading}
        weight={fonts.headingWeight}
        depth={style.headline3d}
      />
      {barText ? <Tag ctx={ctx} text={barText} cx={titleX + titleW / 2} y={yBar} size={hh * 0.055} bg={style.stripBg} color={style.stripText} maxWidth={titleW} /> : null}
      <TitleText text={content.headlineMl} x={titleX} y={yBar + hh * 0.13} width={titleW} size={mlSize} family={fonts.ml} weight={fonts.mlBold} fill={style.headerText} />
      <Sticker ctx={ctx} cx={W - pad - 50 * u} cy={hh * 0.1} size={hh * 0.06} />
    </Group>
  );
}

// ---------- strip (sub-headline + date under the header) ----------

function Strip({ ctx, box }: { ctx: Ctx; box: Box }) {
  const { geo, style, content, fonts, validity } = ctx;
  const text = [content.subheadline, validity].filter(Boolean).join("   •   ");
  const family = /[ഀ-ൿ]/.test(text) ? fonts.ml : fonts.body;
  const size = fit(text, family, fonts.bodySemi, box.w - 40 * geo.u, box.h * 0.46, 12 * geo.u);
  const textW = Math.min(box.w, measure(text, size, family, fonts.bodySemi) + 56 * geo.u);
  const x = box.x + (box.w - textW) / 2;
  const bar = style.stripStyle === "bar";
  return (
    <Group listening={false}>
      <Rect x={x} y={box.y} width={textW} height={box.h} cornerRadius={bar ? 6 * geo.u : box.h / 2} fill={style.stripBg} opacity={bar ? 1 : 0.94} />
      <Text x={x} y={box.y} width={textW} height={box.h} align="center" verticalAlign="middle" text={text} fontFamily={family} fontStyle={fonts.bodySemi} fontSize={size} fill={style.stripText} wrap="none" ellipsis />
    </Group>
  );
}

// ---------- product cards ----------

function GridLines({ ctx, cells }: { ctx: Ctx; cells: Box[] }) {
  const { style, geo } = ctx;
  const color = mix(style.nameColor, style.bgBottom, 0.55);
  const xs = new Set<number>();
  const ys = new Set<number>();
  for (const c of cells) {
    xs.add(Math.round(c.x + c.w + geo.gap / 2));
    ys.add(Math.round(c.y + c.h + geo.gap / 2));
  }
  const top = Math.min(...cells.map((c) => c.y));
  const bottom = Math.max(...cells.map((c) => c.y + c.h));
  const left = geo.grid.x;
  const right = geo.grid.x + geo.grid.w;
  const maxX = Math.max(...cells.map((c) => c.x + c.w));
  return (
    <Group listening={false} opacity={0.7}>
      {[...xs].filter((x) => x < maxX).map((x) => (
        <Line key={`v${x}`} points={[x, top + 10 * geo.u, x, bottom - 10 * geo.u]} stroke={color} strokeWidth={2 * geo.u} />
      ))}
      {[...ys].filter((y) => y < bottom).map((y) => (
        <Line key={`h${y}`} points={[left, y, right, y]} stroke={color} strokeWidth={2 * geo.u} />
      ))}
    </Group>
  );
}

function roundedRectPath(c: Konva.Context, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(r, 0);
  c.arcTo(w, 0, w, h, r);
  c.arcTo(w, h, 0, h, r);
  c.arcTo(0, h, 0, 0, r);
  c.arcTo(0, 0, w, 0, r);
  c.closePath();
}

function ProductCard({
  ctx,
  box,
  item,
  imageScale,
  selected,
  onSelect,
}: {
  ctx: Ctx;
  box: Box;
  item: ResolvedItem;
  imageScale: number;
  selected: boolean;
  onSelect?: () => void;
}) {
  const { style, content, fonts, geo } = ctx;
  const { u } = geo;
  const { w, h } = box;
  const boxed = style.cardStyle === "card" || style.cardStyle === "panel";
  const p = boxed ? Math.max(10 * u, Math.min(w, h) * 0.06) : Math.max(6 * u, Math.min(w, h) * 0.035);
  const radius = Math.min(style.cardRadius * u, w / 4, h / 4);
  const discount = discountPercent(item.normalPrice, item.offerPrice);
  const showMrp = content.showMrp && discount > 0;
  const showBadge = content.showDiscount && discount > 0;
  const ps = style.priceStyle;

  // Names
  const ml = item.nameMl?.trim() ?? "";
  const primaryIsMl = content.nameMode === "ml" && Boolean(ml);
  const primary = primaryIsMl ? ml : item.name;
  const secondary = content.nameMode === "both" ? ml : "";
  const nameSize = Math.min(w * 0.095, h * 0.082) * (primaryIsMl ? 1.06 : 1);
  const secSize = nameSize * 0.84;
  const nameBlockH = nameSize * 1.28 + (secondary ? secSize * 1.42 : 0);
  const nameFamily = primaryIsMl ? fonts.ml : fonts.body;
  const nameWeight = primaryIsMl ? fonts.mlBold : fonts.bodyBold;

  // Regions
  const above = style.namePosition === "above" && (ps === "pill" || ps === "slant" || ps === "circle" || ps === "flag");
  let imgTop = p * 0.8;
  let imgBottom = h - p;
  let nameY = 0;
  let nameX = p;
  let nameW = w - p * 2;
  let nameAlign: "center" | "left" = "center";
  let price: ReactNode = null;

  const priceTextSize = (boxH: number, boxW: number, text: string, unit: string) => {
    let main = boxH * 0.72;
    let unitSize = boxH * 0.3;
    let mainW = measure(text, main, fonts.price, fonts.priceWeight);
    let unitW = unit ? measure(unit, unitSize, fonts.body, fonts.bodySemi) : 0;
    const total = mainW + (unit ? 5 * u + unitW : 0);
    if (total > boxW * 0.9) {
      const k = (boxW * 0.9) / total;
      main *= k;
      unitSize *= k;
      mainW *= k;
      unitW *= k;
    }
    return { main, unitSize, mainW, unitW, total: mainW + (unit ? 5 * u + unitW : 0) };
  };
  const priceStr = formatPrice(item.offerPrice);
  const unitStr = item.unit ? `/${item.unit}` : "";
  const mrpStr = formatPrice(item.normalPrice);

  const renderPrice = ({ x, y, bh, bw, color, align = "center" }: { x: number; y: number; bh: number; bw: number; color: string; align?: "center" | "left" | "right" }) => {
    const m = priceTextSize(bh, bw, priceStr, unitStr);
    const startX = align === "center" ? x + (bw - m.total) / 2 : align === "right" ? x + bw - m.total : x;
    return (
      <>
        <Text x={startX} y={y} height={bh} verticalAlign="middle" text={priceStr} fontFamily={fonts.price} fontStyle={fonts.priceWeight} fontSize={m.main} lineHeight={1} fill={color} wrap="none" listening={false} />
        {unitStr ? (
          <Text x={startX + m.mainW + 5 * u} y={y + bh / 2 - m.unitSize * 0.2} text={unitStr} fontFamily={fonts.body} fontStyle={fonts.bodySemi} fontSize={m.unitSize} fill={color} opacity={0.9} wrap="none" listening={false} />
        ) : null}
      </>
    );
  };

  const renderMrp = ({ x, y, width, size, align = "center", color = style.mrpColor }: { x: number; y: number; width: number; size: number; align?: "center" | "left" | "right"; color?: string }) =>
    showMrp ? (
      <Text x={x} y={y} width={width} align={align} text={`MRP ${mrpStr}`} fontFamily={fonts.body} fontStyle={fonts.bodySemi} fontSize={size} textDecoration="line-through" fill={color} wrap="none" listening={false} />
    ) : null;

  if (ps === "pill") {
    const priceH = Math.min(h * 0.19, w * 0.3);
    const pillY = h - p - priceH;
    const mrpSize = priceH * 0.36;
    const mrpY = showMrp ? pillY - mrpSize * 1.35 : pillY;
    if (above) {
      nameY = p;
      imgTop = nameY + nameBlockH + p * 0.2;
      imgBottom = mrpY - p * 0.3;
    } else {
      nameY = mrpY - nameBlockH;
      imgBottom = nameY - p * 0.2;
    }
    price = (
      <>
        {renderMrp({ x: p, y: mrpY, width: w - p * 2, size: mrpSize })}
        <Rect x={p} y={pillY} width={w - p * 2} height={priceH} cornerRadius={Math.min(radius, priceH / 2)} fill={style.priceBg} listening={false} />
        {renderPrice({ x: p, y: pillY, bh: priceH, bw: w - p * 2, color: style.priceText })}
      </>
    );
  } else if (ps === "tag" || ps === "big") {
    const big = ps === "big";
    const tagH = big ? Math.min(h * 0.2, w * 0.24) : Math.min(h * 0.15, w * 0.22);
    const mrpSize = tagH * (big ? 0.3 : 0.38);
    const priceBlockH = tagH + (showMrp ? mrpSize * 1.3 : 0);
    const rowH = Math.max(priceBlockH, nameBlockH);
    const rowY = h - p - rowH;
    const tagW = Math.min(w * 0.5, priceTextSize(tagH, w * 0.5, priceStr, unitStr).total + tagH * 0.6);
    nameAlign = "left";
    nameX = p;
    nameW = w - p * 3 - tagW;
    nameY = rowY + (rowH - nameBlockH);
    imgBottom = rowY - p * 0.3;
    const tagX = w - p - tagW;
    const tagY = h - p - tagH;
    price = (
      <>
        {renderMrp({ x: tagX - 20 * u, y: tagY - mrpSize * 1.3, width: tagW + 20 * u, size: mrpSize, align: "right" })}
        {big ? null : <Rect x={tagX} y={tagY} width={tagW} height={tagH} cornerRadius={tagH * 0.22} fill={style.priceBg} listening={false} />}
        {renderPrice({ x: tagX, y: tagY, bh: tagH, bw: tagW, color: big ? style.priceBg : style.priceText, align: big ? "right" : "center" })}
      </>
    );
  } else if (ps === "bar") {
    const barH = Math.min(h * 0.17, w * 0.24);
    const barY = h - p - barH;
    const boxW = w * 0.42;
    imgBottom = barY - (showMrp ? barH * 0.42 : p * 0.4);
    const nameAreaX = p + boxW - 6 * u;
    const nameAreaW = w - p - nameAreaX;
    const pSize = Math.min(barH * 0.3, nameAreaW * 0.13);
    price = (
      <>
        <Rect x={nameAreaX} y={barY + barH * 0.14} width={nameAreaW} height={barH * 0.72} fill={style.priceAccent} cornerRadius={3 * u} listening={false} />
        <Text
          x={nameAreaX + 14 * u}
          y={barY + barH * 0.14}
          width={nameAreaW - 18 * u}
          height={barH * 0.72}
          verticalAlign="middle"
          text={[primary, secondary].filter(Boolean).join("\n")}
          fontFamily={fonts.body}
          fontStyle={fonts.bodyBold}
          fontSize={pSize}
          lineHeight={1.15}
          fill={readableOn(style.priceAccent)}
          wrap="none"
          ellipsis
          listening={false}
        />
        <Rect x={p} y={barY} width={boxW} height={barH} cornerRadius={8 * u} fill={style.priceBg} stroke="#ffffff" strokeWidth={4 * u} shadowColor="#000" shadowBlur={8 * u} shadowOpacity={0.25} shadowOffsetY={3 * u} listening={false} />
        {renderPrice({ x: p, y: barY, bh: barH, bw: boxW, color: style.priceText })}
        {renderMrp({ x: p, y: barY - barH * 0.36, width: boxW, size: barH * 0.26 })}
      </>
    );
  } else if (ps === "slant") {
    const tagH = Math.min(h * 0.17, w * 0.24);
    const m = priceTextSize(tagH, w * 0.62, priceStr, unitStr);
    const tagW = Math.min(w * 0.72, m.total + tagH * 1.2);
    const tagX = w - tagW + 6 * u;
    const tagY = h - tagH - p * 0.6;
    const skew = tagH * 0.35;
    if (above) {
      nameY = p * 0.7;
      imgTop = nameY + nameBlockH;
      imgBottom = tagY + tagH * 0.2;
    } else {
      nameY = tagY - nameBlockH - p * 0.2;
      imgBottom = nameY;
    }
    price = (
      <>
        {renderMrp({ x: p, y: tagY + tagH * 0.35, width: w - tagW - p, size: tagH * 0.3, align: "left" })}
        <Line closed points={[tagX + skew, tagY, tagX + tagW, tagY - skew * 0.4, tagX + tagW, tagY + tagH, tagX, tagY + tagH + skew * 0.25]} fill={style.priceBg} shadowColor="#000" shadowBlur={8 * u} shadowOpacity={0.25} shadowOffsetY={3 * u} listening={false} />
        {renderPrice({ x: tagX + skew * 0.6, y: tagY, bh: tagH, bw: tagW - skew * 0.6, color: style.priceText })}
      </>
    );
  } else if (ps === "flag") {
    const flagH = Math.min(h * 0.16, w * 0.24);
    const m = priceTextSize(flagH, w * 0.6, priceStr, unitStr);
    const flagW = Math.min(w * 0.72, m.total + flagH * 1.1);
    const flagY = p * 0.6;
    nameY = h - p - nameBlockH;
    imgTop = flagY + flagH + (showMrp ? flagH * 0.4 : 0);
    imgBottom = nameY - p * 0.2;
    price = (
      <>
        <Line closed points={[0, flagY, flagW, flagY, flagW + flagH * 0.42, flagY + flagH / 2, flagW, flagY + flagH, 0, flagY + flagH]} fill={style.priceBg} shadowColor="#000" shadowBlur={6 * u} shadowOpacity={0.2} shadowOffsetY={2 * u} listening={false} />
        {renderPrice({ x: flagH * 0.2, y: flagY, bh: flagH, bw: flagW - flagH * 0.2, color: style.priceText, align: "left" })}
        {renderMrp({ x: flagH * 0.2, y: flagY + flagH * 1.05, width: flagW, size: flagH * 0.3, align: "left", color: style.priceBg })}
      </>
    );
  } else {
    // circle badge with old price on top
    const r = Math.min(w * 0.22, h * 0.19);
    if (above) {
      nameY = p * 0.7;
      imgTop = nameY + nameBlockH;
      imgBottom = h - p;
    } else {
      nameY = h - p - nameBlockH;
      imgBottom = nameY - p * 0.2;
    }
    const cx = w - r * 1.02;
    const cy = imgBottom - r * 0.95;
    const { main, dec } = splitPrice(item.offerPrice);
    const mainSize = fit(main, fonts.price, fonts.priceWeight, r * 1.25, r * 0.78, 8 * u);
    const mainW = measure(main, mainSize, fonts.price, fonts.priceWeight);
    const decSize = mainSize * 0.5;
    const decW = dec ? measure(dec, decSize, fonts.price, fonts.priceWeight) : 0;
    const startX = -(mainW + decW) / 2;
    price = (
      <Group x={cx} y={cy} rotation={-8} listening={false}>
        <Circle radius={r} fill={style.priceBg} stroke={style.priceAccent} strokeWidth={r * 0.1} shadowColor="#000" shadowBlur={10 * u} shadowOpacity={0.28} shadowOffsetY={4 * u} />
        {showMrp ? <Text x={-r} y={-r * 0.62} width={r * 2} align="center" text={mrpStr} fontFamily={fonts.price} fontStyle={fonts.priceWeight} fontSize={r * 0.26} textDecoration="line-through" fill={style.priceText} opacity={0.8} wrap="none" /> : null}
        <Text x={startX} y={-mainSize * (showMrp ? 0.34 : 0.5)} text={main} fontFamily={fonts.price} fontStyle={fonts.priceWeight} fontSize={mainSize} lineHeight={1} fill={style.priceText} wrap="none" />
        {dec ? <Text x={startX + mainW} y={-mainSize * (showMrp ? 0.34 : 0.5)} text={dec} fontFamily={fonts.price} fontStyle={fonts.priceWeight} fontSize={decSize} lineHeight={1} fill={style.priceText} wrap="none" /> : null}
        {unitStr ? <Text x={-r} y={r * 0.5} width={r * 2} align="center" text={unitStr} fontFamily={fonts.body} fontStyle={fonts.bodySemi} fontSize={r * 0.2} fill={style.priceText} wrap="none" /> : null}
      </Group>
    );
  }

  // Product picture
  const imgBoxW = w - p * 2;
  const imgBoxH = Math.max(8, imgBottom - imgTop);
  const image = item.imageUrl ? getLoadedImage(item.imageUrl) : null;
  let imageNode: ReactNode;
  if (image) {
    const fill = boxed ? 0.94 : 1;
    const s = Math.min(imgBoxW / image.naturalWidth, imgBoxH / image.naturalHeight) * fill * imageScale;
    const iw = image.naturalWidth * s;
    const ih = image.naturalHeight * s;
    imageNode = <KonvaImage image={image} x={(w - iw) / 2} y={imgBottom - ih} width={iw} height={ih} />;
  } else {
    const r = Math.min(imgBoxW, imgBoxH) * 0.38;
    imageNode = (
      <Group x={w / 2} y={imgTop + imgBoxH / 2}>
        <Circle radius={r} fill={mix(boxed ? style.cardBg : style.bgTop, style.nameColor, 0.08)} />
        <Text x={-r} y={-r} width={r * 2} height={r * 2} align="center" verticalAlign="middle" text={item.name.slice(0, 1).toUpperCase()} fontFamily={fonts.heading} fontStyle={fonts.headingWeight} fontSize={r} fill={mix(style.cardBg, style.nameColor, 0.35)} />
      </Group>
    );
  }

  const names =
    ps === "bar" ? null : (
      <>
        <Text x={nameX} y={nameY} width={nameW} align={nameAlign} text={primary} fontFamily={nameFamily} fontStyle={nameWeight} fontSize={nameSize} lineHeight={1.2} fill={style.nameColor} wrap="none" ellipsis listening={false} />
        {secondary ? (
          <Text x={nameX} y={nameY + nameSize * 1.28} width={nameW} align={nameAlign} text={secondary} fontFamily={fonts.ml} fontStyle={fonts.mlBold} fontSize={secSize} lineHeight={1.25} fill={mix(style.nameColor, boxed ? style.cardBg : style.bgBottom, 0.2)} wrap="none" ellipsis listening={false} />
        ) : null}
      </>
    );

  return (
    <Group x={box.x} y={box.y} onClick={onSelect} onTap={onSelect} listening={Boolean(onSelect)}>
      {/* Hit area for free-standing products */}
      <Rect width={w} height={h} fill="#000" opacity={0.001} />
      {boxed ? (
        <Rect
          width={w}
          height={h}
          cornerRadius={radius}
          fill={style.cardBg}
          opacity={style.cardStyle === "panel" ? 0.6 : 1}
          shadowEnabled={style.cardShadow && style.cardStyle === "card"}
          shadowColor="#0b1220"
          shadowBlur={18 * u}
          shadowOpacity={0.16}
          shadowOffsetY={6 * u}
          listening={false}
        />
      ) : null}
      {selected ? <Rect width={w} height={h} cornerRadius={radius} stroke="#059669" strokeWidth={6 * u} dash={boxed ? undefined : [16 * u, 10 * u]} listening={false} /> : null}
      <Group clipFunc={(c) => roundedRectPath(c, w, h, boxed ? radius : 0)} listening={false}>
        {imageNode}
      </Group>
      {names}
      {price}
      {showBadge ? <DiscountBadge ctx={ctx} w={w} h={h} p={p} discount={discount} /> : null}
    </Group>
  );
}

function DiscountBadge({ ctx, w, h, p, discount }: { ctx: Ctx; w: number; h: number; p: number; discount: number }) {
  const { style, fonts, geo } = ctx;
  const { u } = geo;
  const left = style.badgePosition === "left";
  const shadow = { shadowColor: "#000", shadowBlur: 8 * u, shadowOpacity: 0.22, shadowOffsetY: 3 * u };

  if (style.badgeShape === "corner") {
    const tw = Math.max(64 * u, w * 0.28);
    const th = tw * 0.95;
    const x = left ? 0 : w - tw;
    return (
      <Group x={x} y={0} listening={false}>
        <Rect width={tw} height={th} fill={style.badgeBg} {...shadow} />
        <Text y={th * 0.08} width={tw} align="center" text="SAVE" fontFamily={fonts.body} fontStyle={fonts.bodyBold} fontSize={th * 0.15} fill="#ffffff" wrap="none" />
        <Text y={th * 0.27} width={tw} align="center" text={`${discount}%`} fontFamily={fonts.heading} fontStyle={fonts.headingWeight} fontSize={fit(`${discount}%`, fonts.heading, fonts.headingWeight, tw * 0.86, th * 0.42, 8 * u)} lineHeight={1} fill={style.badgeText} wrap="none" />
        <Text y={th * 0.74} width={tw} align="center" text="OFF" fontFamily={fonts.body} fontStyle={fonts.bodyBold} fontSize={th * 0.15} fill="#ffffff" wrap="none" />
      </Group>
    );
  }

  if (style.badgeShape === "dot") {
    const r = Math.min(w, h) * 0.12;
    const cx = left ? p + r * 0.4 : w - p - r * 0.4;
    const cy = p + r * 0.4;
    return (
      <Group x={cx} y={cy} listening={false}>
        <Circle radius={r} fill={style.badgeBg} {...shadow} />
        <Text x={-r} y={-r * 0.55} width={r * 2} align="center" text="DISC" fontFamily={fonts.body} fontStyle={fonts.bodyBold} fontSize={r * 0.34} fill={style.badgeText} wrap="none" />
        <Text x={-r} y={-r * 0.12} width={r * 2} align="center" text={`${discount}%`} fontFamily={fonts.body} fontStyle={fonts.bodyBold} fontSize={r * 0.58} fill={style.badgeText} wrap="none" />
      </Group>
    );
  }

  const r = Math.min(w, h) * 0.17;
  const x = left ? r * 0.78 : w - r * 0.78;
  const y = r * 0.78;
  const big = r * 0.6;
  const small = r * 0.3;
  const blockH = big + small * 1.05;
  return (
    <Group x={x} y={y} rotation={style.badgeShape === "tag" ? 8 : 0} listening={false}>
      {style.badgeShape === "burst" ? (
        <Star numPoints={14} innerRadius={r * 0.84} outerRadius={r} fill={style.badgeBg} {...shadow} />
      ) : style.badgeShape === "circle" ? (
        <Circle radius={r * 0.92} fill={style.badgeBg} stroke={style.badgeText} strokeWidth={3 * u} {...shadow} />
      ) : (
        <Rect x={-r} y={-r * 0.62} width={r * 2} height={r * 1.24} cornerRadius={r * 0.2} fill={style.badgeBg} {...shadow} />
      )}
      <Text x={-r} y={-blockH / 2} width={r * 2} align="center" text={`${discount}%`} fontFamily={fonts.heading} fontStyle={fonts.headingWeight} fontSize={fit(`${discount}%`, fonts.heading, fonts.headingWeight, r * 1.5, big, 6 * u)} lineHeight={1} fill={style.badgeText} wrap="none" />
      <Text x={-r} y={-blockH / 2 + big * 1.02} width={r * 2} align="center" text="OFF" fontFamily={fonts.heading} fontStyle={fonts.headingWeight} fontSize={small} lineHeight={1} fill={style.badgeText} wrap="none" />
    </Group>
  );
}

// ---------- footer ----------

const ICONS = {
  phone:
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  chat: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z",
  pin: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0 M15 10a3 3 0 1 1-6 0a3 3 0 0 1 6 0",
} as const;

function IconCircle({ x, y, r, icon, bg, color }: { x: number; y: number; r: number; icon: keyof typeof ICONS; bg: string; color: string }) {
  const s = (r * 1.1) / 24;
  return (
    <Group x={x} y={y} listening={false}>
      <Circle radius={r} fill={bg} />
      <Path x={-12 * s} y={-12 * s} scaleX={s} scaleY={s} data={ICONS[icon]} stroke={color} strokeWidth={2.2} lineCap="round" lineJoin="round" />
    </Group>
  );
}

function Footer({ ctx, box }: { ctx: Ctx; box: Box }) {
  const { geo, style, content, store, fonts } = ctx;
  const { u, pad } = geo;
  const note = content.footerNote;
  const noteFamily = /[ഀ-ൿ]/.test(note) ? fonts.ml : fonts.body;
  const contact = content.showContact ? contactText(store) : "";

  if (style.footerStyle === "split") {
    const items = content.showContact
      ? ([
          store.phone && { icon: "phone" as const, label: "Call us", value: store.phone },
          store.whatsapp && { icon: "chat" as const, label: "WhatsApp", value: store.whatsapp },
          store.address && { icon: "pin" as const, label: "Visit us", value: store.address },
        ].filter(Boolean) as Array<{ icon: keyof typeof ICONS; label: string; value: string }>)
      : [];
    const noteSize = fit(note, noteFamily, "normal", box.w - pad * 2, 19 * u, 10 * u);
    const rowH = box.h - (note ? noteSize * 1.8 : 0);
    const colW = (box.w - pad * 2) / Math.max(1, items.length);
    const r = Math.min(rowH * 0.3, 30 * u);
    return (
      <Group listening={false}>
        <Rect x={box.x} y={box.y} width={box.w} height={box.h} fill={style.footerBg} />
        {items.map((it, i) => {
          const x = pad + colW * i;
          const textX = x + r * 2 + 12 * u;
          const textW = colW - r * 2 - 20 * u;
          const valueSize = fit(it.value, fonts.body, fonts.bodyBold, textW, rowH * 0.27, 10 * u);
          return (
            <Group key={it.label}>
              <IconCircle x={x + r} y={box.y + rowH / 2} r={r} icon={it.icon} bg={style.footerAccent} color={readableOn(style.footerAccent)} />
              <Text x={textX} y={box.y + rowH / 2 - valueSize * 1.15} width={textW} text={it.label} fontFamily={fonts.body} fontStyle={fonts.bodySemi} fontSize={valueSize * 0.55} fill={style.footerText} opacity={0.85} wrap="none" />
              <Text x={textX} y={box.y + rowH / 2 - valueSize * 0.4} width={textW} text={it.value} fontFamily={fonts.body} fontStyle={fonts.bodyBold} fontSize={valueSize} fill={style.footerText} wrap="none" ellipsis />
            </Group>
          );
        })}
        {note ? (
          <Text x={pad} y={box.y + rowH} width={box.w - pad * 2} align="center" text={note} fontFamily={noteFamily} fontSize={noteSize} fill={style.footerText} opacity={0.85} wrap="none" ellipsis />
        ) : null}
      </Group>
    );
  }

  if (style.footerStyle === "strip") {
    const stripX = box.w * 0.5;
    const nameSize = fit(store.name, fonts.heading, fonts.headingWeight, stripX - pad * 2, box.h * 0.36, 12 * u);
    const contactSize = fit(contact, fonts.body, fonts.bodySemi, stripX - pad * 1.5, box.h * 0.15, 9 * u);
    const logo = content.showLogo && store.logoUrl ? getLoadedImage(store.logoUrl) : null;
    const noteSize = fit(note, noteFamily, fonts.bodyBold, (box.w - stripX - pad * 1.2) * 1.9, box.h * 0.17, 9 * u);
    return (
      <Group listening={false}>
        <Rect x={box.x} y={box.y} width={box.w} height={box.h} fill={style.footerBg} />
        {logo ? (
          <ContainImage image={logo} x={pad} y={box.y + box.h * 0.1} w={stripX - pad * 2} h={box.h * 0.55} />
        ) : (
          <Text x={pad} y={box.y + box.h * 0.12} width={stripX - pad * 1.5} text={store.name} fontFamily={fonts.heading} fontStyle={fonts.headingWeight} fontSize={nameSize} fill={style.footerText} wrap="none" ellipsis />
        )}
        <Text x={pad} y={box.y + box.h * 0.7} width={stripX - pad * 1.5} text={contact} fontFamily={fonts.body} fontStyle={fonts.bodySemi} fontSize={contactSize} fill={style.footerText} wrap="none" ellipsis />
        <Line closed points={[stripX + 40 * u, box.y + box.h * 0.22, box.w, box.y + box.h * 0.12, box.w, box.y + box.h, stripX, box.y + box.h]} fill={style.footerAccent} />
        {note ? (
          <Text
            x={stripX + 50 * u}
            y={box.y + box.h * 0.24}
            width={box.w - stripX - 50 * u - pad * 0.6}
            height={box.h * 0.74}
            align="center"
            verticalAlign="middle"
            text={note}
            fontFamily={noteFamily}
            fontStyle={fonts.bodyBold}
            fontSize={noteSize}
            lineHeight={1.25}
            fill={readableOn(style.footerAccent)}
            wrap="word"
          />
        ) : null}
      </Group>
    );
  }

  const banner = style.footerStyle === "banner";
  const inset = banner ? pad * 0.6 : 0;
  const bx = box.x + inset;
  const bw = box.w - inset * 2;
  const by = box.y + (banner ? 6 * u : 0);
  const bh = box.h - (banner ? 6 * u + pad * 0.4 : 0);
  const lines = [contact, note].filter(Boolean);
  const contactSize = fit(contact, fonts.body, fonts.bodyBold, bw - pad * 2, 28 * u, 14 * u);
  const noteSize = fit(note, noteFamily, "normal", bw - pad * 2, 21 * u, 11 * u);
  const blockH = (contact ? contactSize * 1.3 : 0) + (note ? noteSize * 1.3 : 0) + (lines.length > 1 ? 6 * u : 0);
  const startY = by + (bh - blockH) / 2;
  return (
    <Group listening={false}>
      <Rect x={bx} y={by} width={bw} height={bh} cornerRadius={banner ? bh * 0.3 : 0} fill={style.footerBg} />
      {contact ? <Text x={bx + pad} y={startY} width={bw - pad * 2} align="center" text={contact} fontFamily={fonts.body} fontStyle={fonts.bodyBold} fontSize={contactSize} lineHeight={1.3} fill={style.footerText} wrap="none" ellipsis /> : null}
      {note ? (
        <Text
          x={bx + pad}
          y={startY + (contact ? contactSize * 1.3 + 6 * u : 0)}
          width={bw - pad * 2}
          align="center"
          text={note}
          fontFamily={noteFamily}
          fontSize={noteSize}
          lineHeight={1.3}
          fill={style.footerText}
          opacity={0.88}
          wrap="none"
          ellipsis
        />
      ) : null}
    </Group>
  );
}

// ---------- empty state ----------

function EmptyHint({ ctx }: { ctx: Ctx }) {
  const { geo, fonts } = ctx;
  const { grid, u } = geo;
  return (
    <Group listening={false}>
      <Rect x={grid.x} y={grid.y} width={grid.w} height={grid.h} cornerRadius={24 * u} stroke="#9ca3af" strokeWidth={4 * u} dash={[18 * u, 14 * u]} fill="rgba(255,255,255,0.55)" />
      <Text
        x={grid.x}
        y={grid.y}
        width={grid.w}
        height={grid.h}
        align="center"
        verticalAlign="middle"
        text={"Add products to this poster\nfrom the Products tab"}
        fontFamily={fonts.body}
        fontStyle={fonts.bodySemi}
        fontSize={40 * u}
        lineHeight={1.4}
        fill="#4b5563"
      />
    </Group>
  );
}

// ---------- decorations ----------

const LEAF = "M0 0 C 20 -38, 78 -46, 112 -8 C 76 26, 24 30, 0 0 Z";
const LEAF_VEIN = "M0 0 Q 56 -14 112 -8";
const FLOWER_COLORS = ["#ff8f00", "#ffd600", "#e53935", "#ff5ca8", "#ffffff", "#ff6f00"];

function Flower({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  return (
    <Group x={x} y={y}>
      <Star numPoints={12} innerRadius={r * 0.62} outerRadius={r} fill={color} lineJoin="round" stroke={mix(color, "#000000", 0.12)} strokeWidth={r * 0.06} />
      <Star numPoints={10} innerRadius={r * 0.35} outerRadius={r * 0.6} fill={mix(color, "#ffffff", 0.25)} rotation={18} />
      <Circle radius={r * 0.24} fill={color === "#ffffff" ? "#ffd600" : mix(color, "#5a2a00", 0.5)} />
    </Group>
  );
}

function Decorations({ ctx, layer }: { ctx: Ctx; layer: "back" | "front" }) {
  const { geo, style, seed } = ctx;
  const { width: W, height: H, u } = geo;
  const color = style.decorationColor;
  const hh = geo.header.h;

  if (layer === "front") {
    if (style.decoration !== "kasavu") return null;
    return (
      <Group listening={false}>
        <Rect x={10 * u} y={10 * u} width={W - 20 * u} height={H - 20 * u} stroke={color} strokeWidth={10 * u} cornerRadius={6 * u} />
        <Rect x={28 * u} y={28 * u} width={W - 56 * u} height={H - 56 * u} stroke={color} strokeWidth={3 * u} cornerRadius={4 * u} />
      </Group>
    );
  }

  const rand = seededRandom(`${seed}:${style.decoration}`);
  switch (style.decoration) {
    case "leaves": {
      const spots = [
        { x: -10 * u, y: H * 0.42, r: -30, s: 1.8 },
        { x: -20 * u, y: H * 0.62, r: 10, s: 1.5 },
        { x: W + 10 * u, y: H * 0.5, r: 200, s: 1.8 },
        { x: W + 20 * u, y: H * 0.72, r: 170, s: 1.4 },
        { x: W * 0.06, y: (geo.footer?.y ?? H) - 10 * u, r: -50, s: 1.3 },
        { x: W * 0.94, y: (geo.footer?.y ?? H) - 10 * u, r: 230, s: 1.3 },
      ];
      return (
        <Group listening={false}>
          {spots.map((leaf, i) => (
            <Group key={i} x={leaf.x} y={leaf.y} rotation={leaf.r} scaleX={leaf.s * u} scaleY={leaf.s * u} opacity={0.55}>
              <Path data={LEAF} fill={color} />
              <Path data={LEAF_VEIN} stroke={mix(color, "#000000", 0.25)} strokeWidth={2.5} />
            </Group>
          ))}
        </Group>
      );
    }
    case "dots":
      return (
        <Group listening={false} opacity={0.35}>
          {Array.from({ length: 46 }, (_, i) => (
            <Circle key={i} x={rand() * W} y={hh + rand() * (H - hh)} radius={(6 + rand() * 26) * u} fill={color} />
          ))}
        </Group>
      );
    case "confetti":
      return (
        <Group listening={false} opacity={0.75}>
          {Array.from({ length: 70 }, (_, i) => (
            <Rect
              key={i}
              x={rand() * W}
              y={hh + rand() * (H - hh)}
              width={(10 + rand() * 14) * u}
              height={(5 + rand() * 6) * u}
              rotation={rand() * 360}
              fill={i % 3 === 0 ? "#ffffff" : i % 3 === 1 ? color : mix(color, "#ffffff", 0.5)}
              cornerRadius={2 * u}
            />
          ))}
        </Group>
      );
    case "flowers": {
      const flowers: ReactNode[] = [];
      const corner = (cx: number, cy: number, spread: number, key: string) => {
        for (let i = 0; i < 16; i++) {
          const a = rand() * Math.PI * 2;
          const d = rand() * spread;
          flowers.push(
            <Flower key={`${key}${i}`} x={cx + Math.cos(a) * d} y={cy + Math.sin(a) * d * 0.8} r={(22 + rand() * 26) * u} color={FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)]} />,
          );
        }
      };
      corner(40 * u, 30 * u, 190 * u, "l");
      corner(W - 40 * u, 30 * u, 190 * u, "r");
      corner(W * 0.5, -40 * u, 120 * u, "c");
      return <Group listening={false}>{flowers}</Group>;
    }
    case "sparkles":
      return (
        <Group listening={false}>
          {Array.from({ length: 16 }, (_, i) => {
            const inHeader = i < 11;
            return (
              <Star
                key={i}
                x={rand() * W}
                y={inHeader ? rand() * hh : hh + rand() * (H - hh)}
                numPoints={4}
                innerRadius={(3 + rand() * 3) * u}
                outerRadius={(10 + rand() * 14) * u}
                fill={i % 2 ? color : mix(color, "#ffffff", 0.4)}
                opacity={0.75}
                rotation={rand() * 30}
              />
            );
          })}
        </Group>
      );
    case "swoosh":
      return (
        <Group listening={false}>
          <Path data={`M0 0 L${W} 0 L${W} ${hh * 0.62} C ${W * 0.72} ${hh * 0.9} ${W * 0.38} ${hh * 0.3} 0 ${hh * 0.82} Z`} fill={color} />
          <Path data={`M0 ${hh * 0.82} C ${W * 0.38} ${hh * 0.3} ${W * 0.72} ${hh * 0.9} ${W} ${hh * 0.62} L ${W} ${hh * 0.7} C ${W * 0.72} ${hh * 1.0} ${W * 0.38} ${hh * 0.42} 0 ${hh * 0.9} Z`} fill={mix(color, "#000000", 0.25)} opacity={0.6} />
        </Group>
      );
    default:
      return null;
  }
}
