import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Kinora — il tuo compagno quotidiano nel percorso di riabilitazione';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage() {
  const fontData = await fetch(
    new URL('./PlayfairDisplay-Bold.ttf', import.meta.url)
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'PlayfairDisplay',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            fontSize: 260,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          <span style={{ color: '#E85A7A' }}>K</span>
          <span style={{ color: '#322A6E' }}>inora</span>
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 36,
            color: '#322A6E',
            opacity: 0.7,
            letterSpacing: '0.04em',
            fontWeight: 400,
          }}
        >
          il tuo compagno quotidiano nel percorso di riabilitazione
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'PlayfairDisplay', data: fontData, style: 'normal', weight: 700 }],
    }
  );
}
