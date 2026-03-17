interface RunDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RunDetailPage({ params }: RunDetailPageProps): Promise<React.ReactElement> {
  const { id } = await params;

  return (
    <h1 className="text-3xl font-semibold text-black">
      Processing Run: {id}
    </h1>
  );
}
