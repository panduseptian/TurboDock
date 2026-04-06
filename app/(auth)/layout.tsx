export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md glass rounded-xl shadow-ambient p-8">
        {children}
      </div>
    </div>
  );
}
