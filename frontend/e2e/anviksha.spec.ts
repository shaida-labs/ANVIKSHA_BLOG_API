import { expect, test } from '@playwright/test'

const suffix = String(Date.now()).slice(-10)
const username = `e2e_${suffix}`
const secondUsername = `e2e_other_${suffix}`
const email = `${username}@example.com`
const secondEmail = `${secondUsername}@example.com`
const password = 'E2ePass123!'
const title = `A real browser story ${suffix}`
const updatedTitle = `An edited browser story ${suffix}`
const comment = `A browser-created response ${suffix}`
const png1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test('reader can register, publish, engage, edit, and sign out', async ({
  page,
  browser,
}) => {
  await page.goto('/register')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL(/\/my-posts$/)
  await page.goto('/write')
  await expect(
    page.getByRole('heading', { name: 'Begin a new story.' }),
  ).toBeVisible()

  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Story').fill(
    'This story was written in a real browser against the PostgreSQL API.',
  )
  await page.getByLabel('Choose a cover image').setInputFiles({
    name: 'cover.png',
    mimeType: 'image/png',
    buffer: png1x1,
  })
  await expect(page.getByText('16:9 preview')).toBeVisible()
  await page.getByRole('button', { name: 'Publish story' }).first().click()

  await expect(page).toHaveURL(/\/my-posts$/)
  await page.getByRole('link', { name: title, exact: true }).click()
  await expect(page).toHaveURL(/\/posts\/\d+/)
  const postUrl = page.url()
  await expect(
    page.getByRole('heading', { level: 1, name: title }),
  ).toBeVisible()
  await expect(
    page.getByRole('img', { name: `Cover image for ${title}` }),
  ).toBeVisible()

  await page.getByLabel('Your response').fill(comment)
  await page.getByRole('button', { name: 'Post response' }).click()
  await expect(page.getByText(comment)).toBeVisible()

  await page
    .getByRole('button', {
      name: new RegExp(`^Like ${escapeRegExp(title)}`),
    })
    .click()
  await expect(
    page.getByRole('button', {
      name: new RegExp(`^Unlike ${escapeRegExp(title)}`),
    }),
  ).toBeVisible()

  await page
    .getByRole('button', { name: `Save ${title} to your library` })
    .click()
  await expect(
    page.getByRole('button', { name: `Remove ${title} from your library` }),
  ).toBeVisible()

  await page.goto('/library')
  await expect(page.getByText(title)).toBeVisible()

  await page.goto(postUrl)
  await page.getByRole('link', { name: 'Edit story' }).click()
  await expect(
    page.getByRole('heading', { name: 'Return to the page.' }),
  ).toBeVisible()
  await page.getByLabel('Title').fill(updatedTitle)
  await page.getByRole('button', { name: 'Save changes' }).first().click()
  await expect(page).toHaveURL(/\/my-posts$/)
  await page.getByRole('link', { name: updatedTitle, exact: true }).click()
  await expect(page).toHaveURL(/\/posts\/\d+/)
  await expect(
    page.getByRole('heading', { level: 1, name: updatedTitle }),
  ).toBeVisible()

  const profileButton = page
    .locator('header')
    .getByRole('button')
    .filter({ hasText: username })
  await profileButton.click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login/)
  await page.goto('/write')
  await expect(page).toHaveURL(/\/login\?next=/)

  const otherContext = await browser.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173',
  })
  const otherPage = await otherContext.newPage()
  try {
    await otherPage.goto('/register')
    await otherPage.getByLabel('Username').fill(secondUsername)
    await otherPage.getByLabel('Email address').fill(secondEmail)
    await otherPage.getByLabel('Password', { exact: true }).fill(password)
    await otherPage.getByRole('button', { name: 'Create account' }).click()
    await expect(otherPage).toHaveURL(/\/my-posts$/)

    await otherPage.goto(postUrl)
    await expect(
      otherPage.getByRole('heading', { level: 1, name: updatedTitle }),
    ).toBeVisible()
    await expect(
      otherPage.getByRole('link', { name: 'Edit story' }),
    ).toHaveCount(0)
    await expect(otherPage.getByRole('button', { name: 'Delete' })).toHaveCount(
      0,
    )
  } finally {
    await otherContext.close()
  }
})

test('mobile layout has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const path of ['/', '/login', '/community']) {
    await page.goto(path)
    await expect(page.locator('body')).toBeVisible()
    const overflow = await page.evaluate(() => {
      const root = document.documentElement
      return root.scrollWidth > window.innerWidth + 1
    })
    expect(overflow, `horizontal overflow on ${path}`).toBe(false)
  }
})
