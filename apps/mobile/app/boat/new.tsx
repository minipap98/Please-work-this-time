import { useState } from "react";
import { useRouter } from "expo-router";
import { EMPTY_BOAT_FORM, boatRowFromForm, type BoatForm } from "@bosun/shared/boats/boats";
import { useCreateBoat, useMyBoats } from "@/lib/boats";
import { BoatFormScreen } from "@/screens/BoatForm";
import { Screen, Title } from "@/ui";

export default function NewBoat() {
  const router = useRouter();
  const create = useCreateBoat();
  const { boats, setActiveId } = useMyBoats();
  const [error, setError] = useState<string | null>(null);

  async function save(f: BoatForm) {
    setError(null);
    try {
      const row = await create.mutateAsync(boatRowFromForm(f));
      if (boats.length === 0) await setActiveId(row.id);
      router.replace({ pathname: "/boat/[id]", params: { id: row.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the boat.");
    }
  }

  return (
    <Screen>
      <Title sub="Shops bid better when they know the boat and its engines.">Add a boat</Title>
      <BoatFormScreen initial={EMPTY_BOAT_FORM} onSave={save} saving={create.isPending} error={error} submitLabel="Add boat" />
    </Screen>
  );
}
