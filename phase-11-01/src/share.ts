export type ShareMode = 'shared' | 'copied' | 'unavailable';

type ShareTarget = {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

export function canonicalShareUrl(value: string): string {
  const url = new URL(value);
  url.search = '';
  url.hash = '';
  return url.toString();
}

export async function shareGame(target: ShareTarget, value: string): Promise<ShareMode> {
  const url = canonicalShareUrl(value);
  const data: ShareData = {
    title: 'SWITCHBACK — Stage 01',
    text: '武器を切り替え、エネルギーを回収して突破する横スクロールシューティング。',
    url,
  };
  if (target.share) {
    await target.share(data);
    return 'shared';
  }
  if (target.clipboard) {
    await target.clipboard.writeText(url);
    return 'copied';
  }
  return 'unavailable';
}
