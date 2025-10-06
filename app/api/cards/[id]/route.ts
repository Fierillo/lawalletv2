import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Card } from '@/types/card'
import { validateAdminAuth } from '@/lib/admin-auth'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await validateAdminAuth(request)
  } catch (response) {
    if (response instanceof NextResponse) {
      return response
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const card = await prisma.card.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      createdAt: true,
      title: true,
      lastUsedAt: true,
      username: true,
      otc: true,
      design: {
        select: {
          id: true,
          imageUrl: true,
          description: true,
          createdAt: true
        }
      },
      ntag424: {
        select: {
          cid: true,
          k0: true,
          k1: true,
          k2: true,
          k3: true,
          k4: true,
          ctr: true,
          createdAt: true
        }
      },
      user: {
        select: {
          pubkey: true
        }
      }
    }
  })

  if (!card) {
    return new NextResponse('Card not found', { status: 404 })
  }

  // Transform to match Card type
  const transformedCard: Card = {
    id: card.id,
    design: card.design,
    ntag424: card.ntag424
      ? {
          ...card.ntag424,
          createdAt: card.ntag424.createdAt
        }
      : undefined,
    createdAt: card.createdAt,
    title: card.title || undefined,
    lastUsedAt: card.lastUsedAt || undefined,
    pubkey: card.user?.pubkey,
    username: card.username || undefined,
    otc: card.otc || undefined
  }

  return NextResponse.json(transformedCard)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await validateAdminAuth(request)

    // Find the card first to check if it exists and get ntag424 info
    const card = await prisma.card.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        ntag424Cid: true
      }
    })

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    // Delete card and its associated ntag424 in a transaction
    await prisma.$transaction(async tx => {
      // Delete the card first (this will remove the foreign key reference)
      await tx.card.delete({
        where: { id: params.id }
      })

      // Delete the associated ntag424 if it exists
      if (card.ntag424Cid) {
        await tx.ntag424.delete({
          where: { cid: card.ntag424Cid }
        })
      }
    })

    return NextResponse.json({
      message: 'Card and associated NTAG424 deleted successfully',
      cardId: params.id,
      ntag424Cid: card.ntag424Cid
    })
  } catch (error) {
    console.error('Error deleting card:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
