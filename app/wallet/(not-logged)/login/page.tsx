'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Loader2, QrCode } from 'lucide-react'

import { useAPI } from '@/providers/api'
import { generatePrivateKey, nsecToHex, validateNsec } from '@/lib/nostr'

import { AppContent, AppFooter, AppViewport } from '@/components/app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LaWalletIcon } from '@/components/icon/lawallet'

function WalletLoginPageContent() {
  const [nsecInput, setNsecInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const { loginWithPrivateKey, loginWithSigner, isHydrated, signer, setUserId, setLoginMethod } = useAPI()
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleGenerateWallet = async () => {
    setIsLoading(true)
    setError('')

    try {
      const privateKeyHex = generatePrivateKey()
      loginWithPrivateKey(privateKeyHex)
      router.push('/wallet')
    } catch (err) {
      setError('Failed to generate wallet. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImportWallet = async () => {
    setIsLoading(true)
    setError('')

    if (!nsecInput.trim()) {
      setError('Please enter your nsec private key')
      setIsLoading(false)
      return
    }

    if (!validateNsec(nsecInput.trim())) {
      setError('Invalid nsec format. Please check your private key.')
      setIsLoading(false)
      return
    }

    try {
      const privateKeyHex = nsecToHex(nsecInput.trim())
      loginWithPrivateKey(privateKeyHex)
    } catch (err) {
      setError('Failed to import wallet. Please check your private key.')
      setIsLoading(false)
    }
  }

  const handleExtensionLogin = async () => {
    setIsLoading(true)
    setError('')
    try {
      // Try browser extension first
      if (window.nostr) {
        await window.nostr.getPublicKey()
        loginWithSigner(window.nostr)        
        setLoginMethod('nip07')        
        router.push('/wallet')
        return
      }

      // Mobile: try Amber (NIP-55)
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      if (isMobile) {
        const callbackUrl = encodeURIComponent(`${window.location.origin}/wallet/login?pubkey=`)
        const amberUri = `nostrsigner:?compressionType=none&returnType=signature&type=get_public_key&callbackUrl=${callbackUrl}`

        window.location.href = amberUri
      } else {
        throw new Error('No Nostr extension found. Please install Alby, nos2x, or use Amber on mobile.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')

    } finally {
      setIsLoading(false)
    }
  }

  // Handle Amber callback
  useEffect(() => {
    if (sessionStorage.getItem('amberProcessed')) return

    const pubkey = searchParams.get('pubkey') || searchParams.get('result')
    if (pubkey) {
      const url = new URL(window.location.href)
      url.searchParams.delete('pubkey')
      url.searchParams.delete('result')
      window.history.replaceState({}, '', url.toString())

      if (!/^[0-9a-f]{64}$/i.test(pubkey)) {
        setError('Invalid pubkey from Amber')
        setIsLoading(false)
        return
      }

      const amberSigner = {
        getPublicKey: async () => pubkey,
        signEvent: async (event: any) => ({
          ...event,
          sig: '00'.repeat(64)
        })
      } as any

      loginWithSigner(amberSigner)
      setLoginMethod('amber')
      setUserId(`amber-${pubkey.slice(0, 8)}`)
      sessionStorage.setItem('amberProcessed', 'true')
      router.push('/wallet')
    }
  }, [searchParams, loginWithSigner, setUserId, router])

  useEffect(() => {
    if (signer) {
      router.push('/wallet')
      return
    }
    if (isHydrated) {
      setIsLoading(false)
    }
  }, [isHydrated, signer, router])

  useEffect(() => {
    if (!signer && sessionStorage.getItem('amberProcessed')) {
      sessionStorage.removeItem('amberProcessed')
    }
  }, [signer])

  if (isLoading) {
    return (
      <AppViewport>
        <AppContent>
          <div className="container flex-1 flex flex-col gap-4 w-full h-full text-white">
            Loading...
            <Loader2 className="size-4 animate-spin" />
          </div>
        </AppContent>
      </AppViewport>
    )
  }

  return (
    <>
      <style jsx global>{`
        ::-webkit-scrollbar {
          display: none;
        }
        * {
          scrollbar-width: none;
        }
      `}</style>
      <AppViewport>
        <AppContent>
          <div className="container flex-1 flex flex-col gap-4 w-full h-full">
            <div className="flex flex-col gap-2 w-full">
              <div className="flex flex-row w-full justify-center mt-10">
                <LaWalletIcon width="250" />
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center gap-4 w-full">
              <p className="text-muted-foreground text-lg">
                Access your wallet or create a new one
              </p>
              <div className="flex flex-col gap-2 w-full">
                <Label htmlFor="nsec">Private Key (nsec)</Label>
                <Input
                  id="nsec"
                  type="password"
                  placeholder="nsec1..."
                  value={nsecInput}
                  onChange={e => setNsecInput(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter your nsec private key to import your wallet.
                </p>
              </div>

              <Button
                className="w-full"
                size="lg"
                variant="secondary"
                onClick={handleImportWallet}
                disabled={isLoading || !nsecInput.trim()}
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>Import Wallet</>
                )}
              </Button>

              <Button
                className="w-full"
                size="lg"
                variant="outline"
                onClick={handleExtensionLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>Login with Extension</>
                )}
              </Button>


            </div>

            {error && (
              <Alert
                variant="destructive"
                className="bg-red-500/20 border-red-500/50 backdrop-blur-sm"
              >
                <AlertCircle className="size-4 text-red-400" />
              
                <AlertDescription className="text-red-300">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center w-full gap-2 text-center">
              <div className="opacity-25 w-full h-[1px] bg-muted-foreground"></div>
              <p className="text-sm text-muted-foreground">OR</p>
              <div className="opacity-25 w-full h-[1px] bg-muted-foreground"></div>
            </div>
          </div>
        </AppContent>
        <AppFooter>
          <Button
            className="w-full mb-10"
            size="lg"
            onClick={handleGenerateWallet}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>Create new</>
            )}
          </Button>
        </AppFooter>
      </AppViewport>
    </>
  )
}

export default function WalletLoginPage() {
  return <Suspense fallback={<div>Loading...</div>}><WalletLoginPageContent /></Suspense>
}
