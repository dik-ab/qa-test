import Script from 'next/script';

export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Script
        src="https://api.stg.qa-maching.livepass-aiagent.com/api/spaces/nev_test/site_plugin.js"
        strategy="beforeInteractive"
      />
    </>
  );
}
