import { NostrSigner } from '@nostrify/nostrify'

export function hasNip07Extension() {
  return typeof window !== 'undefined' && !!window.nostr
}

export function isNos2xInstalledButInaccessible() {
  if (typeof window === 'undefined') return false
  const hasNos2xScript = document.querySelector('script[src*="nostr-provider"]') !== null
  return hasNos2xScript && !window.nostr
}

export function getNip07ErrorMessage(error: Error | unknown): string {
  const msg = error instanceof Error ? error.message : String(error)

  if (isNos2xInstalledButInaccessible()) {
    return 'nos2x is installed but cannot be loaded. Known bug: missing web_accessible_resources. Use Alby instead: https://github.com/fiatjaf/nos2x/issues/84'
  }

  if (msg.includes('timeout') || msg.includes('Extension timeout')) {
    return 'Extension timeout. If using nos2x, this is a known bug. Use Alby: https://github.com/fiatjaf/nos2x/issues/84'
  }

  if (msg.includes('No Nostr extension found') || msg.includes('No extension found')) {
    if (document.querySelector('script[src*="nostr-provider"]') || document.querySelector('iframe[src*="nostr"]')) {
      return 'Extension detected but cannot be accessed. Known nos2x bug. Use Alby: https://github.com/fiatjaf/nos2x/issues/84'
    }
  }

  return msg
}

export async function loginWithNip07(signer: NostrSigner): Promise<string> {
  const pubkey = await Promise.race([
    signer.getPublicKey(),
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Extension timeout')), 10000)
    )
  ])

  if (!pubkey) throw new Error('No public key returned')
  return pubkey
}
