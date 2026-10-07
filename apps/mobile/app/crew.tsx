import { useState } from "react";
import { Alert, Text, View } from "react-native";
import type { CrewRole } from "@bosun/shared/shop/crew";
import { useCrew, useCrewActions, useMyVendorProfile } from "@/lib/queries";
import { colors, space } from "@/lib/theme";
import { Badge, Button, Card, Chip, ErrorText, Field, Loading, Muted, Row, Screen, Title } from "@/ui";

export default function Crew() {
  const { data: shop } = useMyVendorProfile();
  const { data: crew = [], isLoading } = useCrew(shop?.id);
  const actions = useCrewActions(shop?.id);
  const [email, setEmail] = useState("");
  const [techName, setTechName] = useState("");
  const [role, setRole] = useState<CrewRole>("tech");
  const [error, setError] = useState<string | null>(null);

  async function invite() {
    if (!email.trim() || !techName.trim()) {
      setError("Email and name are both needed.");
      return;
    }
    setError(null);
    try {
      await actions.invite.mutateAsync({ email, techName: techName.trim(), role });
      setEmail("");
      setTechName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not invite.");
    }
  }

  function rename(m: (typeof crew)[number]) {
    Alert.prompt?.("Rename", "Their assigned jobs follow the new name.", (name) => name && actions.rename.mutate({ member: m, newName: name }), "plain-text", m.techName);
  }

  if (isLoading) return <Loading />;
  return (
    <Screen>
      <Title sub="Techs see their own jobs; managers see the whole board.">Crew</Title>
      <Card>
        <Text style={{ fontWeight: "600", color: colors.text, marginBottom: space.sm }}>Invite someone</Text>
        <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="marco@example.com" />
        <Field label="Name on the board" value={techName} onChangeText={setTechName} placeholder="Marco" />
        <Row style={{ marginBottom: space.md }}>
          <Chip label="Tech" selected={role === "tech"} onPress={() => setRole("tech")} />
          <Chip label="Manager" selected={role === "manager"} onPress={() => setRole("manager")} />
        </Row>
        <ErrorText>{error}</ErrorText>
        <Button title="Send invite" onPress={invite} loading={actions.invite.isPending} />
      </Card>
      {crew.length === 0 && <Muted>No crew yet.</Muted>}
      {crew.map((m) => (
        <Card key={m.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: colors.text }}>{m.techName}</Text>
              <Muted>{m.email}</Muted>
            </View>
            <Badge tone={m.joined ? "green" : "amber"}>{m.joined ? "Joined" : "Invited"}</Badge>
          </View>
          <Row style={{ marginTop: space.sm, flexWrap: "wrap" }}>
            <Chip label="Tech" selected={m.role === "tech"} onPress={() => actions.setRole.mutate({ id: m.id, role: "tech" })} />
            <Chip label="Manager" selected={m.role === "manager"} onPress={() => actions.setRole.mutate({ id: m.id, role: "manager" })} />
            <Button title="Rename" tone="ghost" onPress={() => rename(m)} />
            <Button title="Remove" tone="ghost" onPress={() => Alert.alert(`Remove ${m.techName}?`, undefined, [{ text: "Cancel" }, { text: "Remove", style: "destructive", onPress: () => actions.remove.mutate(m.id) }])} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
