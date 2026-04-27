export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <link rel="preload" href="/hero/byred-hero.webp" as="image" type="image/webp" />
      {children}
    </>
  )
}
