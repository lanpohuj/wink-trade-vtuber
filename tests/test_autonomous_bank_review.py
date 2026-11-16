import hashlib
import unittest
from tools.import_autonomous_bank_review import resolve, merge_reviews


def catalog():
    return dict(records=[dict(id=str(i),category='TEST',text=t,text_sha256=hashlib.sha256(t.encode()).hexdigest())
                         for i,t in enumerate(['Один','Два','Три','Вверх.','Вверх.'])])


def review(source,indices):
    return dict(kind='autonomous_bank_text_review',items=[dict(source['records'][i],status='bad',comment='') for i in indices])


class OwnerApprovalTests(unittest.TestCase):
    def test_later_export_cannot_resurrect_omitted_rejected_text(self):
        c=catalog();first=review(c,[0]);later=review(c,[1]);later['items'][0]['status']='good'
        merged=merge_reviews(first,later)
        result=resolve(c,merged,approve_unmarked=True)
        self.assertEqual(result['counts'],dict(accepted=4,removed=1,unreviewed=0))
        self.assertEqual(result['removed_records'][0]['id'],'0')
    def test_unmarked_are_not_approved_without_explicit_authorization(self):
        c=catalog();r=resolve(c,review(c,[0]))
        self.assertEqual(r['counts'],dict(accepted=0,removed=1,unreviewed=4))

    def test_owner_instruction_keeps_all_other_texts_and_removes_rejected(self):
        c=catalog();r=resolve(c,review(c,[0]),approve_unmarked=True)
        self.assertEqual(r['counts'],dict(accepted=4,removed=1,unreviewed=0))
        self.assertTrue(all(row['text_review_accepted'] for row in r['records']))
        self.assertFalse(r['activated']);self.assertFalse(r['paid_generation_authorized'])

    def test_rejected_identical_words_cannot_return_as_an_unmarked_take(self):
        c=catalog();r=resolve(c,review(c,[3]),approve_unmarked=True)
        self.assertEqual(r['counts']['removed'],2)
        self.assertFalse(any(row['text']=='Вверх.' for row in r['records']))

    def test_stale_duplicate_unknown_review_and_document_flags_are_not_authority(self):
        c=catalog();r=review(c,[0]);r['approve_unmarked']=True
        self.assertEqual(resolve(c,r)['counts']['accepted'],0)
        r['items'][0]['text']='Подмена'
        with self.assertRaises(ValueError):resolve(c,r,approve_unmarked=True)
        r=review(c,[0,0])
        with self.assertRaises(ValueError):resolve(c,r)
        r=review(c,[0]);r['items'][0]['id']='unknown'
        with self.assertRaises(ValueError):resolve(c,r)
