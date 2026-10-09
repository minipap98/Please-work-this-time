import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { isUnconfirmedEmailError } from "@bosun/shared/auth";
import { useAuth } from "@/lib/auth";
import { colors, space } from "@/lib/theme";
import { Button, ErrorText, Field, Muted, Screen } from "@/ui";

export default function Login() {
  const { signIn, resendConfirmation } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    setResent(false);
    const err = await signIn(email.trim(), password);
    setBusy(false);
    if (err) setError(err);
    else router.replace("/");
  }

  // Supabase won't sign in an unconfirmed address; offer the email again instead of a dead end.
  async function resend() {
    const err = await resendConfirmation(email);
    if (err) setError(err);
    else setResent(true);
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center" }}>
        <Text style={{ fontSize: 32, fontWeight: "800", color: colors.navy, letterSpacing: -1 }}>Bosun</Text>
        <Text style={{ color: colors.muted, marginBottom: space.xl }}>Make boating easy.</Text>
        <Field label="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" />
        <Field label="Password" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} placeholder="••••••••" onSubmitEditing={submit} />
        <ErrorText>{error}</ErrorText>
        {isUnconfirmedEmailError(error) && !resent && <Button title="Resend confirmation email" tone="secondary" onPress={resend} style={{ marginBottom: space.md }} />}
        {resent && <Muted style={{ marginBottom: space.md }}>Sent. Open the link in that email, then sign in.</Muted>}
        <Button title="Sign In" onPress={submit} loading={busy} disabled={!email || !password} />
        <View style={{ marginTop: space.md, alignItems: "center" }}>
          <Link href="/forgot-password" style={{ color: colors.sky600, fontWeight: "600" }}>
            Forgot your password?
          </Link>
        </View>
        <View style={{ marginTop: space.xl, alignItems: "center" }}>
          <Text style={{ color: colors.muted }}>
            New to Bosun?{" "}
            <Link href="/signup" style={{ color: colors.sky600, fontWeight: "600" }}>
              Create an account
            </Link>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
