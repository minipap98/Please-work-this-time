import { useState } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { boatFormFromRow, boatRowFromForm, boatTitle, type BoatForm } from "@bosun/shared/boats/boats";
import { useDeleteBoat, useMyBoats, useUpdateBoat } from "@/lib/boats";
import { space } from "@/lib/theme";
import { BoatFormScreen } from "@/screens/BoatForm";
import { Button, Loading, Screen, Title } from "@/ui";

export default function EditBoat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { boats, isLoading } = useMyBoats();
  const update = useUpdateBoat();
  const remove = useDeleteBoat();
  const [error, setError] = useState<string | null>(null);
  const boat = boats.find((b) => b.id === id);

  if (isLoading) return <Loading />;
  if (!boat) return <Screen><Title>That boat isn't on your account.</Title></Screen>;

  async function save(f: BoatForm) {
    setError(null);
    try {
      await update.mutateAsync({ id: boat!.id, patch: boatRowFromForm(f) });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the boat.");
    }
  }

  function confirmDelete() {
    Alert.alert(`Remove ${boatTitle(boat)}?`, "Its Boat Log, service schedule and share links go with it. Jobs you posted for it stay.", [
      { text: "Cancel" },
      {
        text: "Remove boat",
        style: "destructive",
        onPress: async () => {
          try {
            await remove.mutateAsync(boat!.id);
            router.replace("/(owner)/boats");
          } catch (e) {
            Alert.alert("Couldn't remove the boat", e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <Title>{boatTitle(boat)}</Title>
      <BoatFormScreen
        initial={boatFormFromRow(boat)}
        onSave={save}
        saving={update.isPending}
        error={error}
        footer={<Button title="Remove this boat" tone="ghost" onPress={confirmDelete} loading={remove.isPending} style={{ marginTop: space.lg }} />}
      />
    </Screen>
  );
}
