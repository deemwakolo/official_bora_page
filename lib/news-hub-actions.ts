'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from './supabase/server';
import { getNewsHub } from './news-hub';

import type { NewsItem } from '@/app/components/news/newsData';

// ============================================================
// NEWS HUB — SERVER ACTIONS
//
// Write path is save_news_hub_item(...) (SECURITY DEFINER RPC
// from 0006). No direct table writes, no INSERT/UPDATE/DELETE
// policies exist on news_hub.
// ============================================================

export interface NewsHubRecord {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  source: string;
  image: string;
  isHot: boolean;
  publishedAt: string;
}

export async function getNewsHubRecords(): Promise<
  NewsHubRecord[]
> {
  const { feed, featured, featuredId } = await getNewsHub();

  const toRecord = (
    item: NewsItem,
    id: string
  ): NewsHubRecord => ({
    id,
    title: item.title ?? '',
    category: item.category ?? '',
    excerpt: item.excerpt ?? '',
    content: '',
    source: item.source ?? '',
    image: item.image ?? '',
    isHot: item.isHot ?? false,
    publishedAt: item.publishedAt ?? '',
  });

  return [
    toRecord(featured as NewsItem, featuredId),
    ...feed.map((item) => toRecord(item, String(item.id))),
  ];
}

export interface SaveNewsHubResult {
  success: boolean;
  error?: string;
  id?: string;
}

/**
 * HIFADHI AU UNDA ITEM MOJA YA NEWS
 *
 * id = null  -> create
 * id = uuid  -> update that row
 */
export async function saveNewsHubItem(
  payload: NewsHubRecord
): Promise<SaveNewsHubResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error:
          'Unauthorized: you must be signed in as an administrator to save news.',
      };
    }

    const title = payload.title?.trim() ?? '';
    const category = payload.category?.trim() ?? '';
    const excerpt = payload.excerpt?.trim() ?? '';
    const image = payload.image?.trim() ?? '';

    if (!title) {
      return { success: false, error: 'Title is required.' };
    }
    if (!category) {
      return { success: false, error: 'Category is required.' };
    }
    if (!excerpt) {
      return { success: false, error: 'Excerpt is required.' };
    }
    if (!image) {
      return {
        success: false,
        error: 'Image URL is required.',
      };
    }

    const id =
      payload.id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        payload.id
      )
        ? payload.id
        : null;

    const { data, error } = await supabase.rpc(
      'save_news_hub_item',
      {
        p_id: id,
        p_title: title,
        p_category: category,
        p_excerpt: excerpt,
        p_source: payload.source?.trim() || null,
        p_is_hot: payload.isHot ?? false,
        p_published_at:
          payload.publishedAt || new Date().toISOString(),
        p_content: payload.content?.trim() || null,
        p_media_url: image,
      }
    );

    if (error) {
      console.error(
        'save_news_hub_item RPC Error:',
        error.message
      );
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/admin/updates');

    return {
      success: true,
      id: (data as { id?: string } | null)?.id ?? id ?? '',
    };
  } catch (error: any) {
    console.error(
      'saveNewsHubItem Exception:',
      error.message
    );
    return {
      success: false,
      error:
        error.message ||
        'An unexpected error occurred while saving news.',
    };
  }
}
