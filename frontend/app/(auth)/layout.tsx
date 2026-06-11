export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background p-6">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
        {children}
      </div>
    </div>
  );
}
