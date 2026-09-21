import { redirect } from "next/navigation";

export default async function PropertyLegacyRedirectPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  redirect(`/properties/${propertyId}`);
}
