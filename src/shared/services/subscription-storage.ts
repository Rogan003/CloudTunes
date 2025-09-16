export type SubscriptionData = {
  artists: string[];
  albums: string[];
  genres: string[];
};

const KEY = "cloudtunes_subscriptions";

const defaultData: SubscriptionData = { artists: [], albums: [], genres: [] };

export const SubscriptionStorage = {
  load(): SubscriptionData {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...defaultData };
      const parsed = JSON.parse(raw);
      return { artists: parsed.artists ?? [], albums: parsed.albums ?? [], genres: parsed.genres ?? [] } as SubscriptionData;
    } catch {
      return { ...defaultData };
    }
  },
  save(data: SubscriptionData) {
    localStorage.setItem(KEY, JSON.stringify(data));
  },
  subscribe(type: keyof SubscriptionData, id: string) {
    const data = this.load();
    const set = new Set(data[type]);
    set.add(id);
    const updated = { ...data, [type]: Array.from(set) } as SubscriptionData;
    this.save(updated);
    return updated;
  },
  unsubscribe(type: keyof SubscriptionData, id: string) {
    const data = this.load();
    const updatedArr = data[type].filter(x => x !== id);
    const updated = { ...data, [type]: updatedArr } as SubscriptionData;
    this.save(updated);
    return updated;
  }
};
