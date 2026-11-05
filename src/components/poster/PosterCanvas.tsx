"use client";

import type Konva from "konva";
import { useEffect, useMemo, useState, type Ref } from "react";
import { Circle, Group, Image as KonvaImage, Layer, Line, Path, Rect, Shape, Stage, Star, Text } from "react-konva";
import { getLoadedImage, useImages } from "@/lib/client/imageCache";
import { discountPercent, formatPrice, formatValidity } from "@/lib/format";
import { fontFamily, fontWeight, loadPosterFonts, stack } from "@/lib/poster/fonts";
import { cellsFor, contactText, pageItems, posterGeometry, seededRandom, type Box, type PosterGeometry } from "@/lib/poster/layout";
import { mix } from "@/lib/poster/templates";
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

// ---------- text helpers ----------

let measureContext: CanvasRenderingContext2D | null = null;
function measure(text: string, size: number, family: string, weight: string): number {
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
  return {
    heading: stack(style.headingFont, style.mlFont),
    headingWeight: fontWeight(style.headingFont, 800),
    price: stack(style.priceFont, style.mlFont),
    priceWeight: fontWeight(style.priceFont, 800),
    body: stack(style.bodyFont, style.mlFont),
    bodyBold: fontWeight(style.bodyFont, 700),
    bodySemi: fontWeight(style.bodyFont, 600),
    ml: `${fontFamily(style.mlFont)}, ${stack(style.bodyFont, style.mlFont)}`,
    mlBold: fontWeight(style.mlFont, 700),
  };
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
  const { layout, style, content } = poster;
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

  const validityText = formatValidity(content.validFrom, content.validTo);
  const contactLine = contactText(store);
  const geo = posterGeometry(poster, store, items.length);
  const safePage = Math.min(page, geo.pages - 1);
  const visible = pageItems(items, geo, safePage);
  const cells = cellsFor(geo, visible.length);

  const imageUrls = useMemo(
    () => [...visible.map((i) => i.imageUrl), content.showLogo ? store.logoUrl : ""].filter(Boolean),
    [visible, content.showLogo, store.logoUrl],
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
  // Fonts change text metrics, so remount the layer once they are loaded.
  const fonts = resolveFonts(style);
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
        <Background geo={geo} style={style} />
        <Decorations geo={geo} style={style} seed={poster.id} layer="back" />
        <Header geo={geo} style={style} content={content} store={store} fonts={fonts} />
        {geo.strip ? <Strip box={geo.strip} geo={geo} style={style} fonts={fonts} text={[content.subheadline, content.showValidity ? validityText : ""].filter(Boolean).join("   •   ")} /> : null}
        {visible.map((item, index) => (
          <ProductCard
            key={item.id}
            box={cells[index]}
            item={item}
            style={style}
            content={content}
            fonts={fonts}
            u={geo.u}
            imageScale={layout.imageScale}
            selected={selectedId === item.id}
            onSelect={onSelectItem ? () => onSelectItem(item.id) : undefined}
          />
        ))}
        {visible.length === 0 && showEmptyHint ? <EmptyHint geo={geo} fonts={fonts} /> : null}
        {geo.footer ? (
          <Footer box={geo.footer} geo={geo} style={style} fonts={fonts} contact={content.showContact ? contactLine : ""} note={content.footerNote} />
        ) : null}
        <Decorations geo={geo} style={style} seed={poster.id} layer="front" />
      </Layer>
    </Stage>
  );
}

// ---------- pieces ----------

function Background({ geo, style }: { geo: PosterGeometry; style: PosterStyle }) {
  return (
    <Rect
      width={geo.width}
      height={geo.height}
      fillLinearGradientStartPoint={{ x: 0, y: 0 }}
      fillLinearGradientEndPoint={{ x: 0, y: geo.height }}
      fillLinearGradientColorStops={[0, style.bgTop, 1, style.bgBottom]}
      listening={false}
    />
  );
}

function bannerPath(ctx: Konva.Context, width: number, height: number, wave: number) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width, 0);
  ctx.lineTo(width, height - wave);
  ctx.quadraticCurveTo(width / 2, height + wave, 0, height - wave);
  ctx.closePath();
}

function roundedRectPath(ctx: Konva.Context, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(w, 0, w, h, r);
  ctx.arcTo(w, h, 0, h, r);
  ctx.arcTo(0, h, 0, 0, r);
  ctx.arcTo(0, 0, w, 0, r);
  ctx.closePath();
}

function Header({
  geo,
  style,
  content,
  store,
  fonts,
}: {
  geo: PosterGeometry;
  style: PosterStyle;
  content: PosterContent;
  store: Store;
  fonts: Fonts;
}) {
  const { width: W, u, pad } = geo;
  const hh = geo.header.h;
  const wave = 24 * u;
  const banner = style.headerStyle === "banner";
  const ribbon = style.headerStyle === "ribbon";
  // On banner the text sits on the header colour; otherwise on the light poster background.
  const onBg = banner ? style.headerText : style.headerBg;

  const topY = 22 * u;
  const topH = hh * 0.22;
  const logo = content.showLogo && store.logoUrl ? getLoadedImage(store.logoUrl) : null;
  const logoSize = topH;
  const nameX = pad + (logo ? logoSize + 14 * u : 0);

  const badgeSize = topH * 0.4;
  const badgeText = content.badgeText.trim();
  const badgeW = badgeText ? measure(badgeText, badgeSize, fonts.heading, fonts.headingWeight) + badgeSize * 1.2 : 0;

  const hasMl = Boolean(content.headlineMl.trim());
  const headline = content.headline.trim();
  const maxHeadline = hh * (hasMl ? 0.31 : 0.4);
  const headlineSize = fit(headline, fonts.heading, fonts.headingWeight, W - pad * 2 - (ribbon ? 80 * u : 0), maxHeadline, 20 * u);
  const headlineY = topY + topH + hh * (hasMl ? 0.03 : 0.07);
  const mlSize = fit(content.headlineMl, fonts.ml, fonts.mlBold, W - pad * 2, hh * 0.15, 14 * u);
  const mlY = headlineY + headlineSize * 1.04;

  const ribbonW = ribbon ? Math.min(W - pad, measure(headline, headlineSize, fonts.heading, fonts.headingWeight) + headlineSize * 1.3) : 0;
  const ribbonH = headlineSize * 1.3;
  const ribbonX = (W - ribbonW) / 2;
  const ribbonY = headlineY - (ribbonH - headlineSize) / 2;
  const notch = ribbonH * 0.28;

  return (
    <Group listening={false}>
      {banner ? (
        <>
          <Shape
            sceneFunc={(ctx, shape) => {
              bannerPath(ctx, W, hh, wave);
              ctx.fillStrokeShape(shape);
            }}
            fill={style.headerBg}
          />
          {style.decoration === "rays" ? (
            <Group clipFunc={(ctx) => bannerPath(ctx, W, hh, wave)}>
              <Shape
                opacity={0.28}
                fill={style.decorationColor}
                sceneFunc={(ctx, shape) => {
                  const cx = W / 2;
                  const cy = hh * 0.6;
                  const r = W * 1.2;
                  const n = 22;
                  ctx.beginPath();
                  for (let i = 0; i < n; i++) {
                    const a1 = (i / n) * Math.PI * 2;
                    const a2 = a1 + Math.PI / n;
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
                    ctx.lineTo(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
                    ctx.closePath();
                  }
                  ctx.fillShape(shape);
                }}
              />
            </Group>
          ) : null}
        </>
      ) : null}

      {logo ? (
        <Group x={pad} y={topY}>
          <Rect width={logoSize} height={logoSize} cornerRadius={14 * u} fill="#ffffff" shadowColor="#000" shadowBlur={8 * u} shadowOpacity={0.15} />
          <LogoImage image={logo} size={logoSize} inset={6 * u} />
        </Group>
      ) : null}
      <Text
        x={nameX}
        y={topY}
        height={topH}
        width={Math.max(10, W - nameX - pad - badgeW - 20 * u)}
        verticalAlign="middle"
        text={store.name}
        fontFamily={fonts.body}
        fontStyle={fonts.bodyBold}
        fontSize={topH * 0.42}
        fill={onBg}
        wrap="none"
        ellipsis
      />
      {badgeText ? (
        <Group x={W - pad - badgeW / 2} y={topY + topH / 2} rotation={-5}>
          <Rect
            x={-badgeW / 2}
            y={-badgeSize * 0.85}
            width={badgeW}
            height={badgeSize * 1.7}
            cornerRadius={badgeSize * 0.4}
            fill={style.badgeBg}
            shadowColor="#000"
            shadowBlur={10 * u}
            shadowOpacity={0.2}
            shadowOffsetY={3 * u}
          />
          <Text
            x={-badgeW / 2}
            y={-badgeSize * 0.85}
            width={badgeW}
            height={badgeSize * 1.7}
            align="center"
            verticalAlign="middle"
            text={badgeText}
            fontFamily={fonts.heading}
            fontStyle={fonts.headingWeight}
            fontSize={badgeSize}
            fill={style.badgeText}
            wrap="none"
          />
        </Group>
      ) : null}

      {ribbon && headline ? (
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
      <Text
        x={pad}
        y={headlineY}
        width={W - pad * 2}
        align="center"
        text={headline}
        fontFamily={fonts.heading}
        fontStyle={fonts.headingWeight}
        fontSize={headlineSize}
        lineHeight={1}
        fill={ribbon ? style.headerText : onBg}
        wrap="none"
        ellipsis
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

function LogoImage({ image, size, inset }: { image: HTMLImageElement; size: number; inset: number }) {
  const box = size - inset * 2;
  const s = Math.min(box / image.naturalWidth, box / image.naturalHeight);
  const w = image.naturalWidth * s;
  const h = image.naturalHeight * s;
  return <KonvaImage image={image} x={inset + (box - w) / 2} y={inset + (box - h) / 2} width={w} height={h} />;
}

function Strip({ box, geo, style, fonts, text }: { box: Box; geo: PosterGeometry; style: PosterStyle; fonts: Fonts; text: string }) {
  const size = fit(text, fonts.body, fonts.bodySemi, box.w - 40 * geo.u, box.h * 0.46, 12 * geo.u);
  const textW = Math.min(box.w, measure(text, size, fonts.body, fonts.bodySemi) + 56 * geo.u);
  const x = box.x + (box.w - textW) / 2;
  return (
    <Group listening={false}>
      <Rect x={x} y={box.y} width={textW} height={box.h} cornerRadius={box.h / 2} fill="#ffffff" opacity={0.92} />
      <Text
        x={x}
        y={box.y}
        width={textW}
        height={box.h}
        align="center"
        verticalAlign="middle"
        text={text}
        fontFamily={fonts.body}
        fontStyle={fonts.bodySemi}
        fontSize={size}
        fill={mix(style.nameColor, "#000000", 0.1)}
        wrap="none"
        ellipsis
      />
    </Group>
  );
}

function ProductCard({
  box,
  item,
  style,
  content,
  fonts,
  u,
  imageScale,
  selected,
  onSelect,
}: {
  box: Box;
  item: ResolvedItem;
  style: PosterStyle;
  content: PosterContent;
  fonts: Fonts;
  u: number;
  imageScale: number;
  selected: boolean;
  onSelect?: () => void;
}) {
  const { w, h } = box;
  const p = Math.max(10 * u, Math.min(w, h) * 0.06);
  const radius = Math.min(style.cardRadius * u, w / 4, h / 4);
  const discount = discountPercent(item.normalPrice, item.offerPrice);
  const showMrp = content.showMrp && discount > 0;
  const showBadge = content.showDiscount && discount > 0;

  const priceH = Math.min(h * 0.19, w * 0.3);
  const pillY = h - p - priceH;
  const mrpSize = priceH * 0.36;
  const mrpY = showMrp ? pillY - mrpSize * 1.35 : pillY;
  const nameSize = Math.min(w * 0.095, h * 0.08);
  const mlSize = nameSize * 0.85;
  const hasMl = Boolean(item.nameMl);
  const mlY = hasMl ? mrpY - mlSize * 1.45 : mrpY;
  const nameY = mlY - nameSize * 1.28;
  const imgTop = p * 0.8;
  const imgBottom = nameY - p * 0.35;
  const imgBoxW = w - p * 2;
  const imgBoxH = Math.max(8, imgBottom - imgTop);

  const image = item.imageUrl ? getLoadedImage(item.imageUrl) : null;
  let imageNode = null;
  if (image) {
    const s = Math.min(imgBoxW / image.naturalWidth, imgBoxH / image.naturalHeight) * 0.94 * imageScale;
    const iw = image.naturalWidth * s;
    const ih = image.naturalHeight * s;
    imageNode = <KonvaImage image={image} x={(w - iw) / 2} y={imgBottom - ih} width={iw} height={ih} />;
  } else {
    const r = Math.min(imgBoxW, imgBoxH) * 0.38;
    imageNode = (
      <Group x={w / 2} y={imgTop + imgBoxH / 2}>
        <Circle radius={r} fill={mix(style.cardBg, style.nameColor, 0.07)} />
        <Text
          x={-r}
          y={-r}
          width={r * 2}
          height={r * 2}
          align="center"
          verticalAlign="middle"
          text={item.name.slice(0, 1).toUpperCase()}
          fontFamily={fonts.heading}
          fontStyle={fonts.headingWeight}
          fontSize={r}
          fill={mix(style.cardBg, style.nameColor, 0.3)}
        />
      </Group>
    );
  }

  // Price: "₹29" big + "/kg" small, centred together inside the pill.
  const pillW = w - p * 2;
  const priceText = formatPrice(item.offerPrice);
  const unitText = item.unit ? `/${item.unit}` : "";
  let mainSize = priceH * 0.72;
  let unitSize = priceH * 0.3;
  const unitGap = 5 * u;
  let mainW = measure(priceText, mainSize, fonts.price, fonts.priceWeight);
  let unitW = unitText ? measure(unitText, unitSize, fonts.body, fonts.bodySemi) : 0;
  const total = mainW + (unitText ? unitGap + unitW : 0);
  if (total > pillW * 0.9) {
    const k = (pillW * 0.9) / total;
    mainSize *= k;
    unitSize *= k;
    mainW *= k;
    unitW *= k;
  }
  const priceX = p + (pillW - (mainW + (unitText ? unitGap + unitW : 0))) / 2;

  const badgeR = Math.min(w, h) * 0.17;

  return (
    <Group x={box.x} y={box.y} onClick={onSelect} onTap={onSelect} listening={Boolean(onSelect)}>
      <Rect
        width={w}
        height={h}
        cornerRadius={radius}
        fill={style.cardBg}
        shadowEnabled={style.cardShadow}
        shadowColor="#0b1220"
        shadowBlur={18 * u}
        shadowOpacity={0.16}
        shadowOffsetY={6 * u}
        stroke={selected ? "#059669" : undefined}
        strokeWidth={selected ? 6 * u : 0}
      />
      <Group
        clipFunc={(ctx) => roundedRectPath(ctx, w, h, radius)}
        listening={false}
      >
        {imageNode}
      </Group>
      <Text
        x={p}
        y={nameY}
        width={w - p * 2}
        align="center"
        text={item.name}
        fontFamily={fonts.body}
        fontStyle={fonts.bodyBold}
        fontSize={nameSize}
        lineHeight={1.1}
        fill={style.nameColor}
        wrap="none"
        ellipsis
        listening={false}
      />
      {hasMl ? (
        <Text
          x={p}
          y={mlY}
          width={w - p * 2}
          align="center"
          text={item.nameMl}
          fontFamily={fonts.ml}
          fontStyle={fonts.mlBold}
          fontSize={mlSize}
          lineHeight={1.25}
          fill={mix(style.nameColor, style.cardBg, 0.2)}
          wrap="none"
          ellipsis
          listening={false}
        />
      ) : null}
      {showMrp ? (
        <Text
          x={p}
          y={mrpY}
          width={w - p * 2}
          align="center"
          text={`MRP ${formatPrice(item.normalPrice)}`}
          fontFamily={fonts.body}
          fontStyle={fonts.bodySemi}
          fontSize={mrpSize}
          textDecoration="line-through"
          fill={style.mrpColor}
          wrap="none"
          listening={false}
        />
      ) : null}
      <Rect x={p} y={pillY} width={pillW} height={priceH} cornerRadius={Math.min(radius, priceH / 2)} fill={style.priceBg} listening={false} />
      <Text
        x={priceX}
        y={pillY}
        height={priceH}
        verticalAlign="middle"
        text={priceText}
        fontFamily={fonts.price}
        fontStyle={fonts.priceWeight}
        fontSize={mainSize}
        lineHeight={1}
        fill={style.priceText}
        wrap="none"
        listening={false}
      />
      {unitText ? (
        <Text
          x={priceX + mainW + unitGap}
          y={pillY + priceH / 2 - unitSize * 0.25}
          text={unitText}
          fontFamily={fonts.body}
          fontStyle={fonts.bodySemi}
          fontSize={unitSize}
          fill={style.priceText}
          opacity={0.9}
          wrap="none"
          listening={false}
        />
      ) : null}
      {showBadge ? <DiscountBadge x={w - badgeR * 0.78} y={badgeR * 0.78} r={badgeR} discount={discount} style={style} fonts={fonts} u={u} /> : null}
    </Group>
  );
}

function DiscountBadge({
  x,
  y,
  r,
  discount,
  style,
  fonts,
  u,
}: {
  x: number;
  y: number;
  r: number;
  discount: number;
  style: PosterStyle;
  fonts: Fonts;
  u: number;
}) {
  const shadow = { shadowColor: "#000", shadowBlur: 8 * u, shadowOpacity: 0.22, shadowOffsetY: 3 * u };
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
      <Text
        x={-r}
        y={-blockH / 2}
        width={r * 2}
        align="center"
        text={`${discount}%`}
        fontFamily={fonts.heading}
        fontStyle={fonts.headingWeight}
        fontSize={big}
        lineHeight={1}
        fill={style.badgeText}
        wrap="none"
      />
      <Text
        x={-r}
        y={-blockH / 2 + big * 1.02}
        width={r * 2}
        align="center"
        text="OFF"
        fontFamily={fonts.heading}
        fontStyle={fonts.headingWeight}
        fontSize={small}
        lineHeight={1}
        fill={style.badgeText}
        wrap="none"
      />
    </Group>
  );
}

function Footer({
  box,
  geo,
  style,
  fonts,
  contact,
  note,
}: {
  box: Box;
  geo: PosterGeometry;
  style: PosterStyle;
  fonts: Fonts;
  contact: string;
  note: string;
}) {
  const { u, pad } = geo;
  const lines = [contact, note].filter(Boolean);
  const contactSize = fit(contact, fonts.body, fonts.bodyBold, box.w - pad * 2, 28 * u, 14 * u);
  const noteSize = fit(note, fonts.body, "normal", box.w - pad * 2, 21 * u, 12 * u);
  const blockH = (contact ? contactSize * 1.3 : 0) + (note ? noteSize * 1.3 : 0) + (lines.length > 1 ? 6 * u : 0);
  const startY = box.y + (box.h - blockH) / 2;
  return (
    <Group listening={false}>
      <Rect x={box.x} y={box.y} width={box.w} height={box.h} fill={style.footerBg} />
      {contact ? (
        <Text
          x={pad}
          y={startY}
          width={box.w - pad * 2}
          align="center"
          text={contact}
          fontFamily={fonts.body}
          fontStyle={fonts.bodyBold}
          fontSize={contactSize}
          lineHeight={1.3}
          fill={style.footerText}
          wrap="none"
          ellipsis
        />
      ) : null}
      {note ? (
        <Text
          x={pad}
          y={startY + (contact ? contactSize * 1.3 + 6 * u : 0)}
          width={box.w - pad * 2}
          align="center"
          text={note}
          fontFamily={fonts.body}
          fontSize={noteSize}
          lineHeight={1.3}
          fill={style.footerText}
          opacity={0.85}
          wrap="none"
          ellipsis
        />
      ) : null}
    </Group>
  );
}

function EmptyHint({ geo, fonts }: { geo: PosterGeometry; fonts: Fonts }) {
  const { grid, u } = geo;
  return (
    <Group listening={false}>
      <Rect
        x={grid.x}
        y={grid.y}
        width={grid.w}
        height={grid.h}
        cornerRadius={24 * u}
        stroke="#9ca3af"
        strokeWidth={4 * u}
        dash={[18 * u, 14 * u]}
        fill="rgba(255,255,255,0.55)"
      />
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

const LEAF = "M0 0 C 20 -38, 78 -46, 112 -8 C 76 26, 24 30, 0 0 Z";
const LEAF_VEIN = "M0 0 Q 56 -14 112 -8";

function Decorations({ geo, style, seed, layer }: { geo: PosterGeometry; style: PosterStyle; seed: string; layer: "back" | "front" }) {
  const { width: W, height: H, u } = geo;
  const color = style.decorationColor;

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
            <Circle key={i} x={rand() * W} y={geo.header.h + rand() * (H - geo.header.h)} radius={(6 + rand() * 26) * u} fill={color} />
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
              y={geo.header.h + rand() * (H - geo.header.h)}
              width={(10 + rand() * 14) * u}
              height={(5 + rand() * 6) * u}
              rotation={rand() * 360}
              fill={i % 3 === 0 ? "#ffffff" : i % 3 === 1 ? color : mix(color, "#ffffff", 0.5)}
              cornerRadius={2 * u}
            />
          ))}
        </Group>
      );
    default:
      return null;
  }
}
