export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Booking Details</h1>
      <p>Viewing booking ID: {bookingId}</p>
    </div>
  );
}
