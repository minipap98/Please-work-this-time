import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { Link } from "expo-router";
import type { AppRole } from "@bosun/shared/api";
import { signupProblem } from "@bosun/shared/auth";
import { useAuth } from "@/lib/auth";
import { colors, space } from "@/lib/theme";
import { Button, Chip, ErrorText, Field, Row, Screen } from "@/ui";

export default function Signup() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("owner");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const problem = signupProblem({ name, password });
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const err = await signUp(email.trim(), password, name.trim(), role);
    setBusy(false);
    if (err) setError(err);
    else setDone(true);
  }

  if (done) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: colors.navy }}>Check your email</Text>
          <Text style={{ color: colors.muted, marginTop: 8, marginBottom: space.xl }}>We sent a confirmation link to {email.trim()}. Open it, then sign in here.</Text>
          <Link href="/login" asChild>
            <Button title="Back to sign in" tone="secondary" />
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center" }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: colors.navy, marginBottom: space.lg }}>Create your account</Text>
        <Text style={{ fontSize: 12, fontWeight: "600", marginBottom: 6 }}>I am a</Text>
        <Row style={{ marginBottom: space.lg }}>
          <Chip label="Boat owner" selected={role === "owner"} onPress={() => setRole("owner")} />
          <Chip label="Marine shop" selected={role === "vendor"} onPress={() => setRole("vendor")} />
        </Row>
        <Field label={role === "vendor" ? "Business name" : "Full name"} value={name} onChangeText={setName} placeholder={role === "vendor" ? "Harbor Marine" : "Jane Smith"} autoComplete="name" />
        <Field label="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" />
        <Field label="Password" secureTextEntry autoComplete="new-password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" />
        <ErrorText>{error}</ErrorText>
        <Button title="Sign Up" onPress={submit} loading={busy} disabled={!email || !password || !name} />
        <View style={{ marginTop: space.xl, alignItems: "center" }}>
          <Text style={{ color: colors.muted }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: colors.sky600, fontWeight: "600" }}>
              Sign in
            </Link>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
