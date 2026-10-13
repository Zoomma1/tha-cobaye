import { useApi } from "../api-context";
import { Async } from "../lib/Async";
import { loadProfile } from "../lib/queries";
import { useLoad } from "../lib/use-load";

export function Home() {
  const api = useApi();
  const { state } = useLoad(() => loadProfile(api));
  return (
    <Async state={state}>
      {(profile) => (
        <section>
          <h1>{profile.fullName}</h1>
          <p className="headline">{profile.headline}</p>
          <p>{profile.bio}</p>
          <p>{profile.location}</p>
        </section>
      )}
    </Async>
  );
}
