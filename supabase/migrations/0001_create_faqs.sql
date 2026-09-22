-- FAQS: DEDICATED TABLE YA FAQ CONTENT (SI news_hub)
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text,
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index faqs_public_order_idx
on public.faqs (published, sort_order);
