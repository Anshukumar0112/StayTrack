export default async function HostPropertyDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Edit Host Property</h1>
      <p>Managing host property ID: {propertyId}</p>
    </div>
  );
}
