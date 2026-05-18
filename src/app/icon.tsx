import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 256, height: 256 };
export const contentType = 'image/png';

export default async function Icon() {
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
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'PlayfairDisplay',
          fontSize: 200,
          fontWeight: 700,
          color: '#E85A7A',
          letterSpacing: '-0.02em',
          paddingBottom: 12,
        }}
      >
        K
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'PlayfairDisplay', data: fontData, style: 'normal', weight: 700 }],
    }
  );
}
